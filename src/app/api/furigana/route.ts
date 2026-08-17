import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Adds furigana (ruby) to Japanese text.
 *
 * The Live Translation model is a pure translation pipeline and accepts no system instructions, so
 * ruby markup can't be requested inline the way it was with the general-purpose model. Instead the
 * client sends the finished Japanese translation here and gets an annotated copy back.
 *
 * This is deliberately best-effort: if anything goes wrong we return the original text unchanged
 * rather than failing, so a hiccup here can never block a message from being shown.
 */
export async function POST(req: NextRequest) {
  let original = '';
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    original = text;

    if (text.length > 500) {
      return NextResponse.json({ text });
    }

    // Nothing to annotate if there are no kanji at all.
    if (!/[一-龯]/.test(text)) {
      return NextResponse.json({ text });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ text });

    const prompt =
      'Add furigana to the Japanese text below using HTML ruby tags.\n' +
      'Rules:\n' +
      '- Wrap ONLY kanji in <ruby>KANJI<rt>READING</rt></ruby>. Never annotate hiragana, katakana, punctuation, numbers or latin letters.\n' +
      '- Every <rt> must be closed and wrapped in <ruby>.\n' +
      '- Do NOT translate, rephrase, correct, shorten or comment on the text. Keep every character exactly as given, only adding ruby markup.\n' +
      '- Output ONLY the annotated text, with no code fences or explanation.\n\n' +
      `Text: ${text}`;

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
    if (!out) return NextResponse.json({ text });

    out = out.trim();
    if (out.startsWith('```')) {
      out = out.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }

    // Sanity check: stripping the ruby markup must give back the original text. If the model
    // rewrote anything, discard its output rather than showing altered content to the user.
    const stripped = out
      .replace(/<rt>[^<]*<\/rt>/g, '')
      .replace(/<\/?ruby>/g, '')
      .replace(/\s/g, '');
    if (stripped !== text.replace(/\s/g, '')) {
      console.warn('Furigana output did not round-trip; returning original.');
      return NextResponse.json({ text });
    }

    return NextResponse.json({ text: out });
  } catch (error) {
    console.error('Furigana error:', error);
    return NextResponse.json({ text: original });
  }
}
