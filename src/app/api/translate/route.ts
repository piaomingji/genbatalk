import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getGlossaryText } from '@/lib/glossary';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, fromLang, toLang, useRuby, customGlossary } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Rate Limiting via Vercel KV
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const ipKey = `genbatalk:rate:${ip}`;
    let currentIpCount = 0;
    
    try {
      currentIpCount = (await kv.get<number>(ipKey)) || 0;
      if (currentIpCount >= 50) {
        return NextResponse.json(
          { error: '1日の翻訳上限（50回）を超過しました。有料プランのご加入をご検討ください。' },
          { status: 429 }
        );
      }
    } catch (e) {
      console.warn('Vercel KV not connected yet, skipping rate limit check:', e);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let translation = '';

    if (apiKey) {
      try {
        let prompt = '';
        let customGlossaryPrompt = '';
        if (customGlossary && customGlossary.length > 0) {
          const customLines = customGlossary
            .filter((item: any) => item.ja && item.translation && item.lang)
            .map((item: any) => `- "${item.ja}" (ja) <-> "${item.translation}" (${item.lang}) (Translate bidirectionally. When translating to Japanese, always use "${item.ja}")`);
          if (customLines.length > 0) {
            customGlossaryPrompt = `\nCompany-Specific Glossary (You must prioritize these translations):\n${customLines.join('\n')}`;
          }
        }

        const contextStr = 'Context: This is a real-time conversation at a construction site, factory, or industrial workplace between a Japanese supervisor and a foreign worker. Use appropriate industry terminology (e.g., safety harness, curing, helmet) and ensure the translation is clear, polite, and natural for workplace communication.\nNuance Guidelines:\n- Translate Japanese "免許証" or "免許" (referring to driving or operating machinery qualifications) to specific terms like "驾照" (driver\'s license) or "资格证/操作证" (qualification/operation certificate) in Chinese (do not use generic "执照" which means business license).\n- Translate Chinese "驾照" or "驾驶证" back to Japanese specifically as "免許証" (or "運転免許証"), not generic "免許".\n- Apply similar high-fidelity term mappings for other languages (e.g., Vietnamese "bằng lái xe" -> "免許証", "chứng chỉ" -> "資格証").\n- Chinese "还不错" or "还不错吧" (when spoken by a worker to a supervisor) should be translated politely as "悪くないですね", "問題なさそうです", or "順調です" instead of "なかなか良いです" (which sounds condescending/patronizing in Japanese).\n- Translate Japanese "ヘルメット" (hard hat / safety helmet on a work site) to "安全帽" in Chinese, not "头盔" (which refers to motorcycle or combat helmets). In Vietnamese, use "mũ bảo hộ" or "nón bảo hộ" (safety helmet) instead of "mũ bảo hiểm" (motorcycle helmet).\n- For extremely short responses or confirmations (e.g. "예" (ko), "네" (ko), "对" (zh), "yes" (en), "ok" (en), etc.), translate them simply and directly to the equivalent confirmation in the target language (e.g., to Japanese "はい" or "了解しました"). NEVER expand them into long sentences or guess safety warnings.\nCRITICAL: You are a strict translator. You must ONLY output the translated text. NEVER explain the meaning of the input text, NEVER reply to the user, NEVER add warnings or corrections, and NEVER output any conversational comments or advice. Even if the input text is slang, vulgar, safety-critical, or inappropriate, translate it literally and output ONLY the translation.' + getGlossaryText(fromLang, toLang) + '\n' + customGlossaryPrompt;
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

    // Increment KV Rate Limit Counter
    try {
      if (currentIpCount === 0) {
        await kv.set(ipKey, 1, { ex: 24 * 60 * 60 });
      } else {
        const ttl = await kv.ttl(ipKey);
        await kv.set(ipKey, currentIpCount + 1, ttl > 0 ? { ex: ttl } : { ex: 24 * 60 * 60 });
      }
    } catch (e) {}

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
