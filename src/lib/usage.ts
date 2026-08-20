import { createClient, type RedisClientType } from 'redis';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { PLANS, type PlanId, isPlanId } from '@/lib/plans';

/**
 * Daily usage accounting for live translation.
 *
 * Live translation is billed by the second of audio, so an unlimited free tier is an unlimited
 * bill. The browser never talks to Google directly -- it must first collect a short-lived token
 * from this server -- which makes token issuance the one place where a cap can actually be
 * enforced. Refusing to issue is a hard stop; there is no way around it from the client.
 */

/**
 * Seconds of translation included in the free plan each month.
 *
 * Counted per month rather than per day. A daily allowance of ten minutes sounds modest but adds up
 * to five hours a month, which at the metered price of live translation costs more per free user
 * than a paid subscription brings in.
 */
export const FREE_SECONDS_PER_MONTH = Number(process.env.FREE_SECONDS_PER_MONTH || 600);

/** Seconds granted instead once signed in -- a reason to have an account before there is a plan to buy. */
export const SIGNED_IN_SECONDS_PER_MONTH = Number(
  process.env.SIGNED_IN_SECONDS_PER_MONTH || FREE_SECONDS_PER_MONTH * 3
);

/**
 * Sessions may only be started this many times a day, whatever the reported usage says.
 *
 * The seconds figure is reported by the client and is therefore only as honest as the client is.
 * This limit is counted purely on the server and bounds the damage if the reporting is bypassed:
 * a session ends by itself after fifteen minutes, so this caps the worst case regardless.
 */
export const DAILY_SESSION_LIMIT = Number(process.env.FREE_SESSIONS_PER_DAY || 20);

/**
 * The same limits applied per IP address, as a multiple of the per-device figures.
 *
 * Counting per device is accurate but resettable -- clearing site data hands out a fresh allowance.
 * Counting per IP cannot be cleared, but offices, cafes and mobile carriers put many people behind
 * one address, so an identical limit would let the first user lock out everyone else. Both are
 * counted; whichever runs out first stops the session. The IP allowance is deliberately larger so
 * that shared connections are not punished for being shared.
 */
export const IP_MULTIPLIER = Number(process.env.FREE_IP_MULTIPLIER || 4);

export const DEVICE_COOKIE = 'talkie_did';

/** Strips an IP down to something usable as a storage key. */
function ipKeyOf(req: NextRequest): string {
  const raw = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
  const cleaned = raw.replace(/[^a-z0-9.:]/gi, '').slice(0, 45);
  return cleaned || 'noip';
}

/**
 * Shared Redis connection.
 *
 * The database Vercel provisioned exposes a plain `redis://` URL rather than a REST endpoint, so it
 * is reached over a socket rather than with `@vercel/kv`. Serverless functions are reused between
 * requests, so the client is created once per instance and kept -- reconnecting on every request
 * would add latency to the one call that stands between a user and a translation.
 */
let clientPromise: Promise<RedisClientType> | null = null;

function getClient(): Promise<RedisClientType> {
  if (clientPromise) return clientPromise;

  const url = process.env.KV_REDIS_URL || process.env.REDIS_URL;
  if (!url) {
    return Promise.reject(new Error('KV_REDIS_URL is not configured'));
  }

  clientPromise = (async () => {
    const client: RedisClientType = createClient({
      url,
      socket: { connectTimeout: 5000, reconnectStrategy: (retries) => Math.min(retries * 200, 2000) },
    });
    // Without a listener a connection error becomes an unhandled rejection and takes the function
    // down; usage tracking failing should never break translation.
    client.on('error', (e) => console.error('Redis error:', e));
    await client.connect();
    return client;
  })();

  // A failed connection must not be cached forever, or one blip disables tracking until redeploy.
  clientPromise.catch(() => {
    clientPromise = null;
  });

  return clientPromise;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * The key usage is counted against once someone is signed in.
 *
 * Written once and used everywhere, because two places building the same string by hand is how a
 * counter ends up being written under one name and read under another -- which is precisely the
 * bug that let free allowances be handed out over and over in the other three apps.
 */
export const usageIdOf = (userId: string) => `u:${userId}`;

/** Identifies the client. The cookie is the primary key; the IP is a fallback for first contact. */
export function clientKey(req: NextRequest): { id: string; ip: string; isNew: boolean } {
  const ip = ipKeyOf(req);
  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  if (existing && /^[a-z0-9]{8,40}$/i.test(existing)) {
    return { id: existing, ip, isNew: false };
  }
  const random = Math.random().toString(36).slice(2, 12);
  return { id: `${random}${ip.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`.slice(0, 40), ip, isNew: true };
}

/**
 * Who to count this usage against.
 *
 * Signed in, that is the account -- so the allowance follows the person across devices and browsers,
 * and clearing site data no longer hands out a fresh one. Signed out, it falls back to the device
 * cookie, which is enough to meter a free trial.
 */
export interface Subscription {
  plan: PlanId;
  status: string;
  customerId?: string;
  /** Unix seconds; the plan lapses after this unless renewed. */
  currentPeriodEnd?: number;
}

const subKey = (userId: string) => `talkie:sub:${userId}`;

/**
 * Which account a Stripe customer belongs to.
 *
 * Subscription events carry our account id in their metadata, but a refund does not: `charge.refunded`
 * names a customer and nothing else. Without a way back from customer to account, a refund can be
 * received, acknowledged, and still leave the refunded person on a paid plan.
 */
const customerKey = (customerId: string) => `talkie:cus:${customerId}`;

/**
 * The stored record exactly as written, lapsed plans included.
 *
 * `readSubscription` deliberately reports nothing once a plan is no longer live, which is right for
 * deciding what someone may use and wrong for opening the billing portal -- a customer whose card
 * has just been declined is precisely the person who needs to get to it.
 */
export async function readSubscriptionRecord(userId: string): Promise<Subscription | null> {
  try {
    const client = await getClient();
    const raw = await client.get(subKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Subscription;
    return isPlanId(parsed.plan) ? parsed : null;
  } catch (e) {
    console.error('Could not read the subscription:', e);
    return null;
  }
}

export async function readSubscription(userId: string): Promise<Subscription | null> {
  const parsed = await readSubscriptionRecord(userId);
  if (!parsed) return null;
  // Treat anything Stripe no longer considers live as no plan at all.
  const live = parsed.status === 'active' || parsed.status === 'trialing';
  if (!live) return null;
  if (parsed.currentPeriodEnd && parsed.currentPeriodEnd * 1000 < Date.now()) return null;
  return parsed;
}

export async function writeSubscription(userId: string, sub: Subscription): Promise<void> {
  try {
    const client = await getClient();
    await client.set(subKey(userId), JSON.stringify(sub));
    // Written on every save rather than once, so the mapping repairs itself for anyone who
    // subscribed before it existed, the next time Stripe reports anything about them.
    if (sub.customerId) await client.set(customerKey(sub.customerId), userId);
  } catch (e) {
    console.error('Could not save the subscription:', e);
  }
}

export async function findUserByCustomerId(customerId: string): Promise<string | null> {
  try {
    const client = await getClient();
    return await client.get(customerKey(customerId));
  } catch (e) {
    console.error('Could not look up the customer:', e);
    return null;
  }
}

/** Records the Stripe customer for an account without otherwise changing the plan. */
export async function linkStripeCustomer(userId: string, customerId: string): Promise<void> {
  const existing = await readSubscriptionRecord(userId);
  await writeSubscription(userId, {
    plan: existing?.plan ?? 'free',
    status: existing?.status ?? 'none',
    customerId,
    currentPeriodEnd: existing?.currentPeriodEnd,
  });
}

/**
 * Drops an account to the free plan while keeping its customer id.
 *
 * Deleting the record outright also throws away the only link to their Stripe customer, which is
 * what the billing portal needs -- and someone who has just cancelled is quite likely to want their
 * invoices, or to subscribe again.
 */
export async function downgradeToFree(userId: string, status: string): Promise<void> {
  const existing = await readSubscriptionRecord(userId);
  await writeSubscription(userId, {
    plan: 'free',
    status,
    customerId: existing?.customerId,
  });
}

/**
 * Removes an account's subscription record entirely, customer id included.
 *
 * Unlike `downgradeToFree`, this is for a record that should never have existed -- a plan granted by
 * a test-mode webhook, say, whose Stripe customer belongs to an environment the live keys cannot
 * see. Keeping that customer id would be worse than losing it: the billing portal would try to open
 * a customer that does not exist and fail for reasons nobody could work out from the error.
 */
export async function deleteSubscription(userId: string): Promise<void> {
  try {
    const client = await getClient();
    const existing = await readSubscriptionRecord(userId);
    await client.del(subKey(userId));
    if (existing?.customerId) await client.del(customerKey(existing.customerId));
  } catch (e) {
    console.error('Could not delete the subscription:', e);
    throw e;
  }
}

export async function usageIdentity(
  req: NextRequest
): Promise<{
  id: string;
  ip: string;
  isNew: boolean;
  signedIn: boolean;
  isPaid: boolean;
  plan: PlanId;
  allowance: number;
}> {
  const device = clientKey(req);
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) {
      const sub = await readSubscription(userId);
      const plan: PlanId = sub?.plan ?? 'free';
      return {
        id: usageIdOf(userId),
        ip: device.ip,
        isNew: false,
        signedIn: true,
        isPaid: plan !== 'free',
        plan,
        allowance: plan === 'free' ? SIGNED_IN_SECONDS_PER_MONTH : PLANS[plan].seconds,
      };
    }
  } catch (e) {
    // Never let an auth hiccup stop a translation; fall back to the device.
    console.warn('Could not read the session; counting usage by device.', e);
  }
  return {
    ...device,
    signedIn: false,
    isPaid: false,
    plan: 'free',
    allowance: FREE_SECONDS_PER_MONTH,
  };
}

export interface UsageState {
  seconds: number;
  sessions: number;
  ipSeconds: number;
  ipSessions: number;
  /** False when the store is unreachable, i.e. the figures below are not trustworthy. */
  tracked: boolean;
}

/** True when either the device or its IP address has run out of allowance. */
/**
 * True when this request has run out of free allowance.
 *
 * The per-IP ceiling applies to everyone on the free plan, signed in or not. Signing in was briefly
 * treated as proof of good faith and exempted -- which simply moved the loophole: ten free Google
 * accounts would have meant ten allowances from one machine. An account is free to create, so it
 * cannot be what grants trust. Paying is.
 *
 * The connection is the one thing that is awkward to multiply, so it carries the ceiling. It is not
 * airtight either -- mobile networks rotate addresses and a VPN sidesteps it entirely -- but between
 * the two it takes real effort to get much more than intended, which is all a free tier needs.
 */
export function isExhausted(
  u: UsageState,
  opts: { allowance?: number; isPaid?: boolean } = {}
): boolean {
  if (!u.tracked) return false;

  const allowance = opts.allowance ?? FREE_SECONDS_PER_MONTH;
  if (u.seconds >= allowance) return true;

  // Everything below is anti-abuse for the free tier. Someone paying has already identified
  // themselves in the way that matters, and should not be caught by a shared office connection.
  if (opts.isPaid) return false;
  if (u.sessions >= DAILY_SESSION_LIMIT) return true;

  // The connection ceiling is what stops a free allowance being multiplied by making more accounts:
  // an account is free to create, a separate internet connection is not. Sized against the larger
  // free allowance so a handful of genuine users behind one connection can each have theirs.
  return (
    u.ipSeconds >= SIGNED_IN_SECONDS_PER_MONTH * IP_MULTIPLIER ||
    u.ipSessions >= DAILY_SESSION_LIMIT * IP_MULTIPLIER
  );
}

export async function readUsage(id: string, ip: string): Promise<UsageState> {
  const day = today();
  const month = thisMonth();
  try {
    const client = await getClient();
    // Translation time is a monthly allowance; the session counter stays daily as a burst guard.
    const values = await client.mGet([
      `talkie:sec:${id}:${month}`,
      `talkie:ses:${id}:${day}`,
      `talkie:ipsec:${ip}:${month}`,
      `talkie:ipses:${ip}:${day}`,
    ]);
    const num = (v: string | null) => (v ? Number(v) || 0 : 0);
    return {
      seconds: num(values[0]),
      sessions: num(values[1]),
      ipSeconds: num(values[2]),
      ipSessions: num(values[3]),
      tracked: true,
    };
  } catch (e) {
    // Without a store there is no way to count anything. Say so loudly rather than pretending the
    // cap is in force -- an unnoticed silent failure here is exactly how a surprise bill happens.
    console.error(
      'USAGE LIMIT NOT ENFORCED: Redis is unreachable. Check KV_REDIS_URL to cap free usage.',
      e
    );
    return { seconds: 0, sessions: 0, ipSeconds: 0, ipSessions: 0, tracked: false };
  }
}

/** Adds to a counter and gives it a lifetime, so yesterday's rows cannot pile up forever. */
async function bump(client: RedisClientType, key: string, by: number, ttlSeconds: number): Promise<void> {
  const next = await client.incrBy(key, by);
  if (next === by) await client.expire(key, ttlSeconds);
}

const A_DAY_AND_A_HALF = 60 * 60 * 36;
/** Long enough to outlive the longest month with room to spare. */
const TWO_MONTHS = 60 * 60 * 24 * 62;

export async function addSeconds(id: string, ip: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const month = thisMonth();
  const amount = Math.round(seconds);
  try {
    const client = await getClient();
    await Promise.all([
      bump(client, `talkie:sec:${id}:${month}`, amount, TWO_MONTHS),
      bump(client, `talkie:ipsec:${ip}:${month}`, amount, TWO_MONTHS),
    ]);
  } catch (e) {
    console.error('Could not record usage:', e);
  }
}

/**
 * Puts an account's monthly allowance back to full.
 *
 * Called when someone starts paying, because the alternative is indefensible: the counter runs
 * across plans, so a person who had used 25 of their free 30 minutes and then bought the 60-minute
 * plan would find 35 minutes waiting for them. They would have paid, watched the number go up by
 * less than they bought, and been entirely right to complain.
 *
 * Only the account's own tally is cleared. The per-IP figures are left alone -- they are an
 * anti-abuse measure for the free tier, they do not apply to anyone paying, and clearing them would
 * turn one subscription into a way to wipe the ceiling for a whole office.
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  try {
    const client = await getClient();
    await client.del(`talkie:sec:${usageIdOf(userId)}:${thisMonth()}`);
    console.warn(`allowance reset to full for ${userId}`);
  } catch (e) {
    // Not worth failing the webhook over: the customer keeps their plan either way, and the
    // counter clears by itself at the turn of the month.
    console.error('Could not reset the monthly allowance:', e);
  }
}

export async function addSession(id: string, ip: string): Promise<void> {
  const day = today();
  try {
    const client = await getClient();
    await Promise.all([
      bump(client, `talkie:ses:${id}:${day}`, 1, A_DAY_AND_A_HALF),
      bump(client, `talkie:ipses:${ip}:${day}`, 1, A_DAY_AND_A_HALF),
    ]);
  } catch (e) {
    console.error('Could not record session start:', e);
  }
}

/**
 * How many calls a day each supporting endpoint will serve.
 *
 * These endpoints -- proofreading, furigana, text translation, speech -- each cost a little money
 * per call and are reachable without signing in, so an unmetered one is an open invoice. The figure
 * is set well above what a day of real conversation produces; it is there to bound abuse, not to
 * ration ordinary use. Paying customers get a higher ceiling because their conversations are longer.
 */
export const ASSIST_CALLS_PER_DAY = Number(process.env.ASSIST_CALLS_PER_DAY || 400);
export const PAID_ASSIST_CALLS_PER_DAY = Number(process.env.PAID_ASSIST_CALLS_PER_DAY || 3000);

export function assistLimit(isPaid: boolean): number {
  return isPaid ? PAID_ASSIST_CALLS_PER_DAY : ASSIST_CALLS_PER_DAY;
}

/**
 * A simple "N per day" counter for the supporting endpoints (text translation, speech synthesis).
 *
 * Returns false once the allowance is spent. If the store cannot be reached it returns true --
 * these endpoints are cheap next to live translation, and refusing service because a counter is
 * unavailable would be worse than briefly not counting.
 */
export async function consumeDailyQuota(bucket: string, id: string, limit: number): Promise<boolean> {
  const key = `talkie:${bucket}:${id}:${today()}`;
  try {
    const client = await getClient();
    const used = Number((await client.get(key)) || 0);
    if (used >= limit) return false;
    await bump(client, key, 1, A_DAY_AND_A_HALF);
    return true;
  } catch (e) {
    console.error(`Quota check skipped for ${bucket}:`, e);
    return true;
  }
}
