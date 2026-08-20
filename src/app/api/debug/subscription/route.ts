import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteSubscription, readSubscriptionRecord } from '@/lib/usage';

export const runtime = 'nodejs';

/**
 * TEMPORARY -- delete this file once the stale plan it exists to clear is gone.
 *
 * A test-mode subscription grants a plan through the same webhook the live one does, and the record
 * it leaves behind outlives the keys that created it: once the environment is switched to live, the
 * live account knows nothing about that subscription and will never send the event that would end
 * it. The account sits on a paid plan that no Stripe account anywhere agrees exists, and nothing in
 * the normal flow can clear it.
 *
 * Two things keep this safe enough to ship for an afternoon:
 *
 *  - It acts only on the account making the request. There is no user id parameter to tamper with,
 *    so the worst anyone can do is take a paid plan away from themselves.
 *  - It shows before it acts. Opening it plainly reports what is stored; only `?clear=1` removes it.
 *
 * It is still a route that exists to clean up after a mistake, so it should not outlive the mistake.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json(
      { error: 'sign_in_required', hint: 'Talkieにログインした状態で開いてください。' },
      { status: 401 }
    );
  }

  const before = await readSubscriptionRecord(user.id);

  if (req.nextUrl.searchParams.get('clear') !== '1') {
    return NextResponse.json({
      signedInAs: user.email,
      stored: before,
      hint: before
        ? 'この記録を消すには、URLの末尾に &clear=1 を付けて開いてください。'
        : '記録はありません。すでに無料プランです。',
    });
  }

  try {
    await deleteSubscription(user.id);
  } catch {
    return NextResponse.json(
      { error: 'delete_failed', hint: 'Redisに繋がりませんでした。時間をおいて再度お試しください。' },
      { status: 500 }
    );
  }

  const after = await readSubscriptionRecord(user.id);
  return NextResponse.json({
    cleared: true,
    before,
    after,
    hint:
      after === null
        ? '消えました。/api/me を開くと plan は free、allowanceSeconds は 1800 に戻っています。'
        : '記録が残っています。もう一度実行してください。',
  });
}
