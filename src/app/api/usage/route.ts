import { NextRequest, NextResponse } from 'next/server';
import { addSeconds, isExhausted, readUsage, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

/**
 * Records how long the client has actually been translating.
 *
 * The client reports as it goes rather than at the end, so closing the tab mid-conversation still
 * leaves the time accounted for. Each report is clamped, so a bad or hostile client can neither
 * inflate someone's usage nor claim to have used nothing.
 */
export async function POST(req: NextRequest) {
  try {
    const { id, ip, isPaid, allowance } = await usageIdentity(req);
    const body = await req.json().catch(() => ({}));
    const raw = Number(body?.seconds);
    if (!Number.isFinite(raw) || raw <= 0) {
      return NextResponse.json({ ok: true });
    }

    // Reports arrive every few seconds; anything larger than a minute is not a real interval.
    const seconds = Math.min(Math.round(raw), 60);
    await addSeconds(id, ip, seconds);

    const usage = await readUsage(id, ip);
    return NextResponse.json({
      ok: true,
      usedSeconds: usage.seconds,
      limitSeconds: allowance,
      exhausted: isExhausted(usage, { allowance, isPaid }),
    });
  } catch (error) {
    console.error('Usage report error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
