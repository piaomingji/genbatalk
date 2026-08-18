import { NextRequest, NextResponse } from 'next/server';
import { consumeDailyQuota, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, fromLang, toLang, useRuby, customGlossary } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const { id } = await usageIdentity(req);
    if (!(await consumeDailyQuota('txt', id, 300))) {
      return NextResponse.json({ error: 'daily_limit' }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let translation = '';

    if (apiKey) {
      try {
        let prompt = '';
        let customGlossaryPrompt = '';
        if (Array.isArray(customGlossary) && customGlossary.length > 0) {
          const customLines = customGlossary
            .filter((item: any) => item?.source && item?.translation)
            .map((item: any) => `- "${item.source}" <-> "${item.translation}"`);
          if (customLines.length > 0) {
            customGlossaryPrompt = `\nPreferred terms (use these when they apply):\n${customLines.join('\n')}`;
          }
        }

        const contextStr =
          'You are a translator working on a live spoken conversation.\n' +
          'CRITICAL: Output ONLY the translated text. Never explain the input, never reply to it, ' +
          'never add warnings, corrections or commentary. Translate faithfully -- including slang ' +
          'or blunt speech -- without softening, expanding or editorialising.\n' +
          '- Keep short confirmations short. "yes", "对", "네" should become the plain equivalent ' +
          '("はい", "OK"), never an invented sentence.\n' +
          '- Do not assume any particular setting, industry or relationship between the speakers.' +
          customGlossaryPrompt;

        if (useRuby && toLang === 'ja') {
          prompt = `${contextStr}
Translate the following text from language code "${fromLang}" to Japanese ("ja").
Output ONLY the raw translated text. Format all kanji characters with HTML ruby tags for furigana (e.g., <ruby>私<rt>わたし</rt></ruby>は<ruby>行<rt>い</rt></ruby>きます). Ensure that every <rt> tag is properly closed with a matching </rt> tag and wrapped in <ruby> tags. Do not include any other markdown, headers, prefixes, or comments.
Text: ${text}`;
        } else {
          prompt = `${contextStr}
Translate the following text from language code "${fromLang}" to language code "${toLang}".
Output ONLY the raw translated text. Do not add any prefixes, quotes, explanations, or metadata. If the text is already in the target language, return it as is.
Text: ${text}`;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
              }
            }),
          }
        );

        const data = await response.json();
        console.log('Gemini Translation Raw Response:', JSON.stringify(data));
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          translation = generatedText.trim();
        }
      } catch (err) {
        console.error('Gemini API call failed, falling back to dict:', err);
      }
    }

    // Fallback if Gemini failed or API key not present
    if (!translation) {
      const simulatedTranslations: Record<string, Record<string, string>> = {
        ja_vi: {
          'ヘルメットを着用してください': 'Hãy đội mũ bảo hiểm.',
          'ヘルメットをかぶってください': 'Hãy đội mũ bảo hiểm.',
          '足元に注意してください': 'Hãy cẩn thận dưới chân.',
          '足元に注意して作業してください': 'Hãy cẩn thận dưới chân khi làm việc.',
          '本日の作業は終了です': 'Công việc hôm nay đã kết thúc.',
          'お疲れ様でした': 'Cảm ơn vì sự vất vả của bạn.',
          'ここに荷物を置いてください': 'Hãy để hành lý ở đây.',
          '手伝ってください': 'Hãy giúp tôi một tay.',
          'わかりました': 'Tôi đã hiểu.',
          '分かりました': 'Tôi đã hiểu.',
          'こんにちは': 'Xin chào.',
          'どこから来ましたか': 'Bạn đến từ đâu?',
        },
        vi_ja: {
          'hãy đội mũ bảo hiểm.': 'ヘルメットを着用してください。',
          'hãy cẩn thận dưới chân.': '足元に注意してください。',
          'hãy cẩn thận dưới chân khi làm việc.': '足元に注意して作業してください。',
          'công việc hôm nay đã kết thúc.': '本日の作業は終了です。',
          'cảm ơn vì sự vất vả của bạn.': 'お疲れ様でした。',
          'hãy để hành lý ở đây.': 'ここに荷物を置いてください。',
          'hãy giúp tôi một tay.': '手伝ってください。',
          'tôi đã hiểu.': '分かりました。',
          'tôi hiểu rồi.': '分かりました。',
          'xin chào': 'こんにちは。',
          'bạn đến từ đâu?': 'どこから来ましたか。',
        }
      };

      const key = `${fromLang}_${toLang}`;
      const cleanText = text.trim().replace(/[。、.!?]/g, '').toLowerCase();

      if (simulatedTranslations[key] && simulatedTranslations[key][cleanText]) {
        translation = simulatedTranslations[key][cleanText];
      } else {
        translation = `[${toLang}] ${text}`;
      }
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText: translation,
      model: 'gemini-2.5-flash',
    });
  } catch (error) {
    console.error('Translation server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
