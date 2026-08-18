import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isPlanId, priceIdFor } from '@/lib/plans';
import { createCheckoutSession } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Starts a subscription checkout and hands back the URL to send the customer to.
 *
 * Signing in first is required, and not merely for convenience: a subscription has to belong to
 * something more durable than a browser cookie, or the customer loses it the moment they clear their
 * data or pick up a different device.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; email?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const cycle = body?.cycle === 'yearly' ? 'yearly' : 'monthly';

    if (!isPlanId(plan) || plan === 'free') {
      return NextResponse.json({ error: 'unknown_plan' }, { status: 400 });
    }

    const priceId = priceIdFor(plan, cycle);
    if (!priceId) {
      console.error(`No Stripe price configured for ${plan}/${cycle}`);
      return NextResponse.json({ error: 'plan_unavailable' }, { status: 503 });
    }

    const origin = req.nextUrl.origin;
    const checkout = await createCheckoutSession({
      priceId,
      userId: user.id,
      email: user.email,
      successUrl: `${origin}/pricing/success?plan=${plan}`,
      cancelUrl: `${origin}/pricing`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error('Checkout could not be started:', error);
    return NextResponse.json({ error: error?.message || 'checkout_failed' }, { status: 500 });
  }
}
