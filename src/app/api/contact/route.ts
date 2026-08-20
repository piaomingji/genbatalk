import { NextRequest, NextResponse } from 'next/server';
import { consumeDailyQuota, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

/**
 * Delivers a support enquiry.
 *
 * The message is posted server-side to the same Google Form the other three apps use, which drops
 * it into a spreadsheet and mails a notification. It is not the prettiest arrangement, but it works
 * today and needs no mail service, no API key and no address published on a public page.
 *
 * This route has to work. The legal notice promises that address and phone number are disclosed on
 * request "via the contact form below" -- so this form is the one channel by which that promise can
 * be kept. It previously did nothing at all: the page waited a second and a half and then said the
 * message had been sent.
 */

/** The shared form, and the field ids inside it. Identical across all four apps. */
const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc2ae-xalCKC6_S-uEZOccZnwFXNPCGnvYtISd6CJPQkydhLw/formResponse';

const FIELD = {
  name: 'entry.256677115',
  email: 'entry.786759119',
  subject: 'entry.973342212',
  message: 'entry.1795818340',
  type: 'entry.2093645915',
} as const;

/**
 * The categories the form offers.
 *
 * A Google Form rejects a multiple-choice answer that is not one of its own options, so anything
 * unrecognised falls back to the catch-all rather than being sent through and silently lost.
 */
const TYPES = ['製品について', '技術サポート', '料金・プラン', 'その他'] as const;

/** Long enough for a real enquiry, short enough not to be worth abusing. */
const MAX = { name: 100, email: 200, subject: 200, message: 4000 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim();
    const subject = String(body?.subject ?? '').trim();
    const message = String(body?.message ?? '').trim();
    const type = TYPES.includes(body?.type) ? body.type : 'その他';

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'すべての項目を入力してください。' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません。' },
        { status: 400 }
      );
    }
    if (
      name.length > MAX.name ||
      email.length > MAX.email ||
      subject.length > MAX.subject ||
      message.length > MAX.message
    ) {
      return NextResponse.json({ error: '入力が長すぎます。' }, { status: 400 });
    }

    // Anyone can reach this without signing in, and every submission lands in a shared spreadsheet.
    // A genuine person does not send twenty enquiries in a day; someone flooding the sheet would.
    const { id } = await usageIdentity(req);
    if (!(await consumeDailyQuota('contact', id, 20))) {
      return NextResponse.json(
        { error: '本日の送信上限に達しました。時間をおいてお試しください。' },
        { status: 429 }
      );
    }

    const params = new URLSearchParams();
    params.append(FIELD.name, name);
    params.append(FIELD.email, email);
    // All four apps share one form and it has no field naming the app, so the subject carries it.
    // Without this, an enquiry about Talkie is indistinguishable from one about WallAI.
    params.append(FIELD.subject, `[Talkie] ${subject}`);
    params.append(FIELD.message, message);
    params.append(FIELD.type, type);

    const res = await fetch(FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Google Form responded ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Say plainly that it did not go through. Reporting success on a failure is what this route
    // used to do, and it is the one outcome worse than an error message.
    console.error('Contact submission failed:', error);
    return NextResponse.json(
      { error: 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。' },
      { status: 500 }
    );
  }
}
