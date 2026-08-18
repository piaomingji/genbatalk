import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readSubscription } from '@/lib/usage';
import { createBillingPortalSession } from '@/lib/stripe';

export const runtime = 'nodejs';

/** Sends the customer to Stripe to change their card or cancel. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

    const sub = await readSubscription(userId);
    if (!sub?.customerId) return NextResponse.json({ error: 'no_subscription' }, { status: 404 });

    const portal = await createBillingPortalSession({
      customerId: sub.customerId,
      returnUrl: `${req.nextUrl.origin}/pricing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error: any) {
    console.error('Billing portal failed:', error);
    return NextResponse.json({ error: error?.message || 'portal_failed' }, { status: 500 });
  }
}
