import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A very small Stripe client, spoken over their REST API directly.
 *
 * The official SDK would do the same work, but this app needs exactly three things -- start a
 * checkout, open the billing portal, and verify a webhook -- and each is a single request. Talking
 * to the API directly keeps a large dependency out of a project that otherwise has almost none.
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

async function post<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encode(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe responded ${res.status}`);
  }
  return json as T;
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
