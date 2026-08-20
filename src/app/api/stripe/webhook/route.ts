import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscriptionNow, listLiveSubscriptions, verifyWebhookSignature } from '@/lib/stripe';
import {
  downgradeToFree,
  findUserByCustomerId,
  readSubscriptionRecord,
  resetMonthlyUsage,
  writeSubscription,
} from '@/lib/usage';
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
        // Read the record as stored rather than only a live plan: a returning customer's lapsed
        // record still holds the customer id, and discarding it here would strand them outside the
        // billing portal.
        const existing = await readSubscriptionRecord(userId);
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
        // Our checkout puts the account id in the metadata; the customer mapping is the fallback for
        // a subscription created some other way, such as from the Stripe dashboard.
        const userId =
          object.metadata?.userId ??
          (typeof object.customer === 'string'
            ? await findUserByCustomerId(object.customer)
            : null);
        if (!userId) {
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
        const existing = await readSubscriptionRecord(userId);
        const live = object.status === 'active' || object.status === 'trialing';
        const wasLive = existing?.status === 'active' || existing?.status === 'trialing';

        await writeSubscription(userId, {
          plan,
          status: object.status,
          customerId:
            typeof object.customer === 'string' ? object.customer : existing?.customerId,
          // Newer API versions moved the period end onto the subscription's items, so accept either.
          currentPeriodEnd:
            object.current_period_end ?? object.items?.data?.[0]?.current_period_end,
        });

        /**
         * A new plan starts with its full allowance.
         *
         * Deliberately conditional on the plan having actually changed. `customer.subscription.updated`
         * also fires for a renewal, a new card, and every toggle of "cancel at period end" -- and a
         * reset on any of those would hand out a fresh hour to anyone who worked out that switching
         * a setting back and forth refills the meter.
         */
        const changed = live && plan !== 'free' && (!wasLive || existing?.plan !== plan);
        if (changed) await resetMonthlyUsage(userId);

        console.warn(
          `subscription ${object.status}: ${userId} -> ${plan}${changed ? ' (allowance reset)' : ''}`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const userId =
          object.metadata?.userId ??
          (typeof object.customer === 'string'
            ? await findUserByCustomerId(object.customer)
            : null);
        if (userId) {
          await downgradeToFree(userId, 'canceled');
          console.warn(`subscription cancelled: ${userId}`);
        } else {
          console.error('Cancelled subscription could not be attributed to an account.');
        }
        break;
      }

      /**
       * A refund undoes the payment, so it has to undo the plan as well.
       *
       * Nothing else does: cancelling the subscription in Stripe is a separate act, and a refund on
       * its own leaves the subscription running -- so without this the customer keeps the paid plan
       * they have been paid back for, and is billed again next month.
       *
       * Only full refunds are acted on. A partial refund is usually a goodwill gesture rather than
       * an undoing of the sale, and there is no way to tell from the amount alone which was meant.
       */
      case 'charge.refunded': {
        const customerId = typeof object.customer === 'string' ? object.customer : null;
        if (!customerId) {
          console.error('Refunded charge has no customer; cannot attribute it.');
          break;
        }

        const fullyRefunded =
          object.refunded === true || Number(object.amount_refunded) >= Number(object.amount);
        if (!fullyRefunded) {
          console.warn(
            `Partial refund on ${customerId} (${object.amount_refunded} of ${object.amount}); plan left as it is.`
          );
          break;
        }

        // Stop the subscription first. If this throws, the error response makes Stripe retry, and
        // leaving someone on a plan they paid for is a far smaller problem than billing them again.
        for (const sub of await listLiveSubscriptions(customerId)) {
          await cancelSubscriptionNow(sub.id);
          console.warn(`refund: cancelled subscription ${sub.id}`);
        }

        const userId = await findUserByCustomerId(customerId);
        if (userId) {
          await downgradeToFree(userId, 'refunded');
          console.warn(`refund: ${userId} returned to the free plan`);
        } else {
          // The subscription is stopped either way; only the plan on our side is left standing.
          console.error(
            `Refunded ${customerId} is not linked to an account. Subscriptions were cancelled, but the plan must be cleared by hand.`
          );
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
