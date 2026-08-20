import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { linkStripeCustomer, readSubscriptionRecord } from '@/lib/usage';
import { createBillingPortalSession, findCustomerIdByEmail } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Sends the customer to Stripe to change their card or cancel.
 *
 * The terms page promises that a subscription can be cancelled from the settings screen, so this is
 * the one route that has to work for anyone who has ever paid -- not only for those on a live plan.
 * Someone whose card was declined last night, or who cancelled and now wants a receipt, arrives here
 * with no active subscription at all, and being turned away is exactly what must not happen to them.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; email?: string } | undefined;
    if (!user?.id) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

    // The stored record rather than a live plan: a lapsed one still carries the customer id.
    let customerId = (await readSubscriptionRecord(user.id))?.customerId;

    // Nothing on file: ask Stripe whether this address belongs to a customer. Covers anyone who
    // subscribed before customer ids were being kept.
    if (!customerId && user.email) {
      customerId = await findCustomerIdByEmail(user.email);
      // Record it, so the lookup happens once rather than on every visit.
      if (customerId) await linkStripeCustomer(user.id, customerId);
    }

    if (!customerId) {
      // Not a failure: most people who get here have simply never subscribed.
      return NextResponse.json({ error: 'no_subscription' }, { status: 404 });
    }

    const portal = await createBillingPortalSession({
      customerId,
      returnUrl: `${req.nextUrl.origin}/pricing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error: any) {
    console.error('Billing portal failed:', error);
    return NextResponse.json({ error: error?.message || 'portal_failed' }, { status: 500 });
  }
}
