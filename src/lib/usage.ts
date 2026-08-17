import { createClient, type RedisClientType } from 'redis';
import { NextRequest } from 'next/server';

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

export interface UsageState {
  seconds: number;
  sessions: number;
  ipSeconds: number;
  ipSessions: number;
  /** False when the store is unreachable, i.e. the figures below are not trustworthy. */
  tracked: boolean;
}

/** True when either the device or its IP address has run out of allowance. */
export function isExhausted(u: UsageState): boolean {
  if (!u.tracked) return false;
  return (
    u.seconds >= FREE_SECONDS_PER_MONTH ||
    u.sessions >= DAILY_SESSION_LIMIT ||
    u.ipSeconds >= FREE_SECONDS_PER_MONTH * IP_MULTIPLIER ||
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
