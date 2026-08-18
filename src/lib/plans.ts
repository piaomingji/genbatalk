/**
 * What each plan costs and how much translation it includes.
 *
 * Minutes are the unit of value because they are the unit of cost: live translation is billed by
 * the second, so "unlimited" has no floor on what a single heavy user can cost. Every figure here
 * leaves a healthy margin over the underlying usage.
 */
export type PlanId = 'free' | 'plus' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly translation allowance, in seconds. */
  seconds: number;
  /** Price in the smallest currency unit (cents), monthly. */
  monthlyCents: number;
  /** Stripe price ids, supplied through the environment so test and live keys can differ. */
  monthlyPriceId?: string;
  yearlyPriceId?: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    seconds: Number(process.env.FREE_SECONDS_PER_MONTH || 600),
    monthlyCents: 0,
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    seconds: 60 * 60, // 60 minutes
    monthlyCents: 799,
    monthlyPriceId: process.env.STRIPE_PRICE_PLUS_MONTHLY,
    yearlyPriceId: process.env.STRIPE_PRICE_PLUS_YEARLY,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    seconds: 200 * 60, // 200 minutes
    monthlyCents: 1999,
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'plus' || value === 'pro';
}

/** Resolves the Stripe price for a plan and billing cycle, if one has been configured. */
export function priceIdFor(plan: PlanId, cycle: 'monthly' | 'yearly'): string | undefined {
  const p = PLANS[plan];
  return cycle === 'yearly' ? p.yearlyPriceId : p.monthlyPriceId;
}
