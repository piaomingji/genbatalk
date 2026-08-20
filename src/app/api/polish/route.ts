import { NextRequest, NextResponse } from 'next/server';
import { assistLimit, consumeDailyQuota, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

/**
 * The longest draft worth proofreading.
 *
 * A single spoken turn is a sentence or two. Anything approaching this length did not come from a
 * conversation, and the prompt is billed by the size of what goes into it, so there is no reason to
 * pay for a stranger's essay.
 */
const MAX_INPUT_CHARS = 2000;

/**
 * Smooths a translation that already exists.
 *
 * This deliberately does NOT re-translate. The live translation model works from the audio itself,
 * which is consistently more accurate than the text transcript running alongside it -- a spoken
 * "元気を感じない" was transcribed as "元気を感じてる", and re-translating that transcript produced a
 * sentence with the opposite meaning while the audio-derived translation had been correct.
 *
 * So the draft is authoritative for meaning. All this pass may do is fix wording that is clearly
 * unnatural in the target language. Anything more is rejected by the caller.
 */
export async function POST(req: NextRequest) {
  let draft = '';
  try {
    const body = await req.json();
    const source: string = body?.source || '';
    draft = body?.draft || '';
    const fromLang: string = body?.fromLang || '';
    const toLang: string = body?.toLang || '';
    const useRuby: boolean = !!body?.useRuby;
    const customGlossary = Array.isArray(body?.customGlossary) ? body.customGlossary : [];

    if (!draft) {
      return NextResponse.json({ error: 'draft is required' }, { status: 400 });
    }

    // Over-long input and a spent allowance both give back the draft untouched rather than an
    // error: proofreading is a finishing touch, and the message it belongs to is already correct
    // and already on screen. Failing loudly here would take a working translation away.
    if (draft.length > MAX_INPUT_CHARS || source.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ text: draft });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ text: draft });

    // Counted only now, so the cheap exits above cost nobody their allowance.
    const { id, isPaid } = await usageIdentity(req);
    if (!(await consumeDailyQuota('polish', id, assistLimit(isPaid)))) {
      console.warn('Proofreading allowance spent; returning the draft as it is.');
      return NextResponse.json({ text: draft });
    }

    const customLines = customGlossary
      .filter((item: any) => item?.source && item?.translation)
      .map((item: any) => `- "${item.source}" <-> "${item.translation}"`);

    const prompt =
      'You are proofreading a translation that was produced directly from a speaker\'s audio during ' +
      'a live conversation.\n\n' +
      'The DRAFT is authoritative for meaning. It came from the audio itself and is more reliable ' +
      'than the transcript, which is provided only as loose context and may contain recognition ' +
      'errors.\n\n' +
      'Your ONLY job is to fix wording that is clearly unnatural or ungrammatical in the target ' +
      'language. In particular:\n' +
      '- Supply a subject or possessive that the target language requires but the draft dropped. ' +
      'For example "名字叫金成" reads as a fragment in Chinese and should be "我的名字叫金成".\n' +
      '- Complete a sentence that was left hanging on a connective ending.\n' +
      '- Replace word-for-word carry-overs between languages that share characters. Chinese and ' +
      'Japanese use many of the same characters, so a literal rendering stays readable while ' +
      'sounding wrong, and these slip through easily. Say it the way a native speaker would:\n' +
      '    · 半小时 -> 30分 (NOT 半時間)\n' +
      '    · 点菜 / 点的菜 -> 注文した料理 (NOT 点菜)\n' +
      '    · 服务员 -> 店員さん (NOT 服務員)\n' +
      '    · 上菜 -> 料理が来る / 出てくる (NOT 上菜)\n' +
      '    · 明天 -> 明日 (NOT 明天)\n' +
      '  Treat these as examples of the pattern, not an exhaustive list: whenever a word in the ' +
      'draft looks like it was carried straight across rather than translated, replace it with the ' +
      'ordinary term in the target language. The meaning must stay identical.\n\n' +
      'Absolute rules:\n' +
      '- NEVER change the meaning. Never negate, un-negate, soften, strengthen, add or remove ' +
      'information. If the draft says someone is tired, the result must still say they are tired.\n' +
      '- NEVER "correct" the draft to match the transcript when they disagree. The draft wins.\n' +
      '- Do not assume any particular setting, industry or relationship between the speakers.\n' +
      '- If nothing genuinely needs changing, return the draft exactly as it is.\n' +
      '- Output ONLY the resulting text: no quotes, no explanation, no code fences.\n' +
      (useRuby && toLang === 'ja'
        ? '- Keep any existing <ruby>/<rt> furigana markup intact, and add it for kanji that lack it.\n'
        : '') +
      (customLines.length ? `\nPreferred terms:\n${customLines.join('\n')}\n` : '') +
      `\nSource language: ${fromLang}. Target language: ${toLang}.\n` +
      `Transcript (context only, may be wrong): ${source}\n` +
      `DRAFT (authoritative): ${draft}\n`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json();
    let out: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) return NextResponse.json({ text: draft });

    out = out.trim();
    if (out.startsWith('```')) {
      out = out.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }

    return NextResponse.json({ text: out || draft });
  } catch (error) {
    console.error('Polish error:', error);
    return NextResponse.json({ text: draft });
  }
}
