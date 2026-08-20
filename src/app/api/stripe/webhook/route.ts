import { NextRequest, NextResponse } from 'next/server';
import {
  cancelSubscriptionNow,
  listLiveSubscriptions,
  retrieveSubscription,
  verifyWebhookSignature,
  type StripeSubscription,
} from '@/lib/stripe';
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

/**
 * Records the plan a Stripe subscription describes.
 *
 * Every event that could tell us about a subscription goes through here, so it must be safe to run
 * more than once for the same subscription -- checkout and the subscription events often describe
 * the same purchase, and Stripe retries anything that does not return a 2xx.
 */
async function applySubscription(userId: string, sub: StripeSubscription): Promise<PlanId | null> {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = planForPrice(priceId);
  if (!plan || !isPlanId(plan)) {
    // Almost always a price id that has not been put into the environment, so say which.
    console.error(`No plan matches price ${priceId}. Check STRIPE_PRICE_* environment variables.`);
    return null;
  }

  const existing = await readSubscriptionRecord(userId);
  const live = sub.status === 'active' || sub.status === 'trialing';
  const wasLive = existing?.status === 'active' || existing?.status === 'trialing';

  await writeSubscription(userId, {
    plan,
    status: sub.status,
    customerId: typeof sub.customer === 'string' ? sub.customer : existing?.customerId,
    // Newer API versions moved the period end onto the subscription's items, so accept either.
    currentPeriodEnd: sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end,
  });

  /**
   * A new plan starts with its full allowance.
   *
   * Conditional on the plan having actually changed. Renewals, a new card, and every toggle of
   * "cancel at period end" all arrive here too, and a reset on any of those would hand a fresh hour
   * to anyone who worked out that flipping a setting back and forth refills the meter. The same
   * condition makes running this twice for one purchase harmless.
   */
  if (live && plan !== 'free' && (!wasLive || existing?.plan !== plan)) {
    await resetMonthlyUsage(userId);
  }

  console.warn(`subscription ${sub.status}: ${userId} -> ${plan}`);
  return plan;
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
      /**
       * A checkout finished.
       *
       * This grants the plan too, rather than leaving it to the subscription events. Which of those
       * an endpoint receives depends on what was ticked in the Stripe dashboard, and the first live
       * purchase here was lost exactly that way: `customer.subscription.created` was not among the
       * subscribed events, so this was the only event delivered, and it did nothing but note the
       * customer id. The payment succeeded, Stripe reported no failures, and the account stayed free.
       *
       * The subscription is fetched from the API rather than read from the session, because the
       * session does not carry the price. Fetching also means this and `customer.subscription.*`
       * agree on the answer whichever arrives first.
       */
      case 'checkout.session.completed': {
        const userId = object.client_reference_id;
        if (!userId) break;

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

        if (typeof object.subscription === 'string') {
          // A failure here must not be swallowed. Returning an error makes Stripe retry, which is
          // the difference between a plan arriving late and a plan never arriving at all.
          const sub = await retrieveSubscription(object.subscription);
          await applySubscription(userId, sub);
        } else {
          console.warn(`checkout completed for ${userId} with no subscription attached.`);
        }
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
        await applySubscription(userId, object);
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
