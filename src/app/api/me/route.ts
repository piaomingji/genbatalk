import { NextRequest, NextResponse } from 'next/server';
import { isExhausted, readUsage, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

/** What the interface needs to show: which plan is in force, and how much of it is left. */
export async function GET(req: NextRequest) {
  try {
    const { id, ip, signedIn, isPaid, plan, allowance } = await usageIdentity(req);
    const usage = await readUsage(id, ip);
    return NextResponse.json({
      signedIn,
      isPaid,
      plan,
      allowanceSeconds: allowance,
      usedSeconds: usage.seconds,
      exhausted: isExhausted(usage, { allowance, isPaid }),
    });
  } catch (error) {
    console.error('Could not read the account state:', error);
    return NextResponse.json({ signedIn: false, plan: 'free' }, { status: 200 });
  }
}
