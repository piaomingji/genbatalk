import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { clearSubscription, readSubscription, writeSubscription } from '@/lib/usage';
import { PLANS, isPlanId, type PlanId } from '@/lib/plans';

export const runtime = 'nodejs';

/**
 * Where Stripe reports what happened to a subscription.
 *
 * This is the only thing that grants a paid plan. The success page the customer lands on cannot be
 * trusted for that -- anyone can visit a URL -- whereas this arrives signed by Stripe and is retried
 * until it succeeds, so a plan is granted exactly when money actually changed hands.
 */

/** Works out which of our plans a Stripe price belongs to. */
function planForPrice(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId) return plan.id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured; refusing the webhook.');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  // The signature covers the exact bytes Stripe sent, so the body must be read raw.
  const rawBody = await req.text();
  if (!verifyWebhookSignature(rawBody, req.headers.get('stripe-signature'), secret)) {
    console.warn('Rejected a webhook with an invalid signature.');
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad_payload' }, { status: 400 });
  }

  try {
    const object = event?.data?.object ?? {};

    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = object.client_reference_id;
        if (!userId) break;

        // Only fill in the customer id, and only alongside whatever is already recorded.
        //
        // Stripe sends this and `customer.subscription.created` at practically the same moment, in
        // no guaranteed order. This used to write a placeholder of plan "free", status "incomplete"
        // -- which, when it happened to arrive second, wiped out the real subscription that had just
        // been recorded. The customer had paid, the events all returned 200, and the account stayed
        // on the free plan.
        const existing = await readSubscription(userId);
        await writeSubscription(userId, {
          plan: existing?.plan ?? 'free',
          status: existing?.status ?? 'incomplete',
          customerId: typeof object.customer === 'string' ? object.customer : existing?.customerId,
          currentPeriodEnd: existing?.currentPeriodEnd,
        });
        console.warn(`checkout completed for ${userId} (plan so far: ${existing?.plan ?? 'pending'})`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const userId = object.metadata?.userId;
        if (!userId) {
          // Set by our checkout; missing means the subscription was created some other way (from the
          // Stripe dashboard, say) and there is no way to know whose account it belongs to.
          console.error('Subscription has no userId in its metadata; cannot attribute it.');
          break;
        }
        const priceId = object.items?.data?.[0]?.price?.id;
        const plan = planForPrice(priceId);
        if (!plan || !isPlanId(plan)) {
          // Almost always a price id that has not been put into the environment, so say which.
          console.error(
            `No plan matches price ${priceId}. Check STRIPE_PRICE_* environment variables.`
          );
          break;
        }
        const existing = await readSubscription(userId);
        await writeSubscription(userId, {
          plan,
          status: object.status,
          customerId:
            typeof object.customer === 'string' ? object.customer : existing?.customerId,
          // Newer API versions moved the period end onto the subscription's items, so accept either.
          currentPeriodEnd:
            object.current_period_end ?? object.items?.data?.[0]?.current_period_end,
        });
        console.warn(`subscription ${object.status}: ${userId} -> ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const userId = object.metadata?.userId;
        if (userId) {
          await clearSubscription(userId);
          console.warn(`subscription cancelled: ${userId}`);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Answer with an error so Stripe retries rather than dropping the event.
    console.error('Webhook handling failed:', error);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
}
