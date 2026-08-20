import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A very small Stripe client, spoken over their REST API directly.
 *
 * The official SDK would do the same work, but this app needs only a handful of calls -- start a
 * checkout, open the billing portal, look a customer up, end a subscription, and verify a webhook --
 * and each is a single request. Talking to the API directly keeps a large dependency out of a
 * project that otherwise has almost none.
 */
const API = 'https://api.stripe.com/v1';

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return key;
}

/** Stripe takes form-encoded bodies, including for nested fields (`a[b]=c`). */
function encode(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') body.append(key, String(value));
  }
  return body.toString();
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const encoded = encode(params);
  // Stripe reads GET parameters from the query string; everything else from the body.
  const url = method === 'GET' && encoded ? `${API}${path}?${encoded}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : encoded,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe responded ${res.status}`);
  }
  return json as T;
}

function post<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  return request<T>('POST', path, params);
}

export interface CheckoutSession {
  id: string;
  url: string;
}

/**
 * Starts a subscription checkout.
 *
 * The account id travels in `client_reference_id` and in the subscription's metadata, so the webhook
 * can tell whose plan changed without needing a lookup table of its own.
 */
export function createCheckoutSession(opts: {
  priceId: string;
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  return post<CheckoutSession>('/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': opts.priceId,
    'line_items[0][quantity]': 1,
    client_reference_id: opts.userId,
    customer_email: opts.email,
    'subscription_data[metadata][userId]': opts.userId,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: 'true',
    // Let Stripe work out sales tax / VAT per country rather than doing it by hand.
    'automatic_tax[enabled]': 'true',
  });
}

/** A link to Stripe's own page for changing card details or cancelling. */
export function createBillingPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return post<{ url: string }>('/billing_portal/sessions', {
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

/**
 * Finds the Stripe customer belonging to an email address.
 *
 * Used only as a fallback for opening the billing portal. The customer id is normally recorded when
 * the subscription is created, but anyone who subscribed before that was being saved has no id on
 * file, and telling them to contact support in order to cancel is precisely the sort of dead end the
 * portal exists to avoid. Stripe matches the address exactly, so this finds nothing if the person
 * paid with a different address than they signed in with -- an acceptable miss for a fallback.
 */
export async function findCustomerIdByEmail(email: string): Promise<string | undefined> {
  const found = await request<{ data: Array<{ id: string }> }>('GET', '/customers', {
    email,
    limit: 1,
  });
  return found.data?.[0]?.id;
}

/** Only the parts of a Stripe subscription this app reads. */
export interface StripeSubscription {
  id: string;
  status: string;
  customer?: string;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number }> };
}

/**
 * Fetches a subscription by id.
 *
 * Lets the webhook work out what was bought from a `checkout.session.completed` event alone, rather
 * than waiting for a `customer.subscription.*` event to arrive. Which of those events an endpoint
 * receives depends on what someone ticked in the Stripe dashboard, and a plan that is granted only
 * when a particular checkbox happens to be set is a plan that will one day not be granted -- as
 * happened here: the first live purchase went through, Stripe reported success, and the account
 * stayed on the free tier because `customer.subscription.created` was not among the subscribed
 * events.
 */
export function retrieveSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return request<StripeSubscription>('GET', `/subscriptions/${subscriptionId}`);
}

/** Every subscription on a customer that Stripe still considers live. */
export async function listLiveSubscriptions(
  customerId: string
): Promise<Array<{ id: string; status: string }>> {
  const found = await request<{ data: Array<{ id: string; status: string }> }>(
    'GET',
    '/subscriptions',
    { customer: customerId, status: 'all', limit: 20 }
  );
  return (found.data || []).filter(
    s => s.status !== 'canceled' && s.status !== 'incomplete_expired'
  );
}

/**
 * Ends a subscription immediately.
 *
 * Reserved for refunds. A customer cancelling of their own accord is cancelled at the period end
 * instead -- they paid for the month and should keep it -- but money that has been handed back
 * should not leave a subscription behind to bill again next month.
 */
export function cancelSubscriptionNow(subscriptionId: string): Promise<unknown> {
  return request('DELETE', `/subscriptions/${subscriptionId}`);
}

/**
 * Confirms a webhook really came from Stripe.
 *
 * Without this the endpoint would accept anyone's POST, and granting a paid plan is exactly the
 * kind of thing a stranger would like to POST. Compared in constant time so the comparison itself
 * cannot leak the expected value.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(kv => {
      const [k, ...rest] = kv.split('=');
      return [k.trim(), rest.join('=')];
    })
  );
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Reject anything old enough to be a replay of a captured request.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
