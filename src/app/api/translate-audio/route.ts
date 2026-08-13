import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getGlossaryText } from '@/lib/glossary';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const fromLang = formData.get('fromLang') as string || 'ja';
    const toLang = formData.get('toLang') as string || 'ja';
    const useRubyVal = formData.get('useRuby') as string || 'true';
    const useRuby = useRubyVal === 'true';

    const customGlossaryRaw = formData.get('customGlossary') as string | null;
    let customGlossary: any[] = [];
    if (customGlossaryRaw) {
      try {
        customGlossary = JSON.parse(customGlossaryRaw);
      } catch (e) {
        console.error('Failed to parse customGlossary from request:', e);
      }
    }

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
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
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    // Convert audio file to Base64
    const bytes = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(bytes).toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    // Prepare translation prompt with dynamic glossary
    const contextStr = 'Context: This is a real-time conversation at a construction site, factory, or industrial workplace between a Japanese supervisor and a foreign worker. Use appropriate industry terminology (e.g., safety harness, curing, helmet) and ensure the translation is clear, polite, and natural for workplace communication.\n' +
      'Nuance Guidelines:\n' +
      '- Clean Up Spoken Hesitations & Stutters: Remove spoken hesitations, false starts, and duplicate repeated phrases in speech (e.g., "今日作業する前、開始する前に..." -> "今日作業する前に..."). Output concise, natural, non-repetitive workplace translation without repeating phrases.\n' +
      '- Translate Japanese "免許証" or "免許" (referring to qualifications) to "驾照" (driver\'s license) or "资格证/操作证" (qualification/operation certificate) in Chinese (do not use generic "执照").\n' +
      '- Translate Chinese "驾照" or "驾驶证" back to Japanese specifically as "免許証" (or "運転免許証"), not generic "免許".\n' +
      '- Translate Japanese "ヘルメット" to "安全帽" in Chinese, and "mũ bảo hộ" or "nón bảo hộ" in Vietnamese (do not use "头盔" or "mũ bảo hiểm").\n' +
      '- Chinese "还不错" or "还不错吧" (spoken by a worker to a supervisor) should be translated politely as "悪くないですね", "問題なさそうです", or "順調です".\n' +
      'CRITICAL: You are a strict translator. You must ONLY output the translated text. NEVER explain the meaning of the input, NEVER reply, NEVER add warnings or corrections, and NEVER output any conversational comments or advice.';

    // Format custom glossary
    let customGlossaryPrompt = '';
    if (customGlossary && customGlossary.length > 0) {
      const customLines = customGlossary
        .filter((item: any) => item.ja && item.translation && item.lang)
        .map((item: any) => `- "${item.ja}" (ja) must be translated to "${item.translation}" (${item.lang})`);
      if (customLines.length > 0) {
        customGlossaryPrompt = `\nCompany-Specific Glossary (You must prioritize these translations):\n${customLines.join('\n')}`;
      }
    }

    // Inject glossary dynamically for target language to ensure correct translation
    const glossaryText = getGlossaryText('ja', toLang) + '\n' + getGlossaryText(toLang, 'ja') + '\n' + customGlossaryPrompt;

    let instruction = '';
    if (fromLang === 'ja') {
      instruction = `${contextStr}\n${glossaryText}\n\n` +
        `The spoken audio is in Japanese ("ja") spoken by a Japanese supervisor.\n` +
        `1. Transcribe the spoken audio accurately in Japanese as "transcription".\n` +
        `2. Translate the Japanese text into language code "${toLang}" as "translation".\n` +
        `3. Set "detectedLanguage" to "ja".\n` +
        `Output the result strictly in JSON format containing "transcription", "translation", and "detectedLanguage".`;
    } else if (toLang === 'ja') {
      instruction = `${contextStr}\n${glossaryText}\n\n` +
        `The spoken audio is in a foreign language (e.g. Chinese, Vietnamese, Korean, English, Tagalog, Indonesian, Nepali, Burmese, etc.) spoken by a foreign worker.\n` +
        `1. Automatically detect the spoken foreign language.\n` +
        `2. Transcribe the spoken audio accurately in its native language as "transcription".\n` +
        `3. Translate the spoken text into Japanese ("ja") as "translation".\n` +
        (useRuby ? `Format all kanji characters in the Japanese translation with HTML ruby tags for furigana (e.g., <ruby>私<rt>わたし</rt></ruby>は<ruby>行<rt>い</rt></ruby>きます). Ensure that every <rt> tag is properly closed with a matching </rt> tag and wrapped in <ruby> tags. Only add ruby tags to Kanji characters. NEVER add ruby tags to Hiragana, Katakana, punctuation, numbers, or English letters.\n` : '') +
        `4. Set "detectedLanguage" to the 2-letter ISO 639-1 code of the detected spoken foreign language (e.g. "zh", "vi", "ko", "en", "tl", "id", "ne", "my").\n` +
        `Output the result strictly in JSON format containing "transcription", "translation", and "detectedLanguage".`;
    } else {
      instruction = `${contextStr}\n${glossaryText}\n\n` +
        `Listen to the spoken audio. Automatically detect the spoken language, transcribe it as "transcription", and translate it to language code "${toLang}" as "translation". Set "detectedLanguage" to the 2-letter ISO code. Output the result strictly in JSON format.`;
    }

    console.log(`Translate-Audio: Sending to Gemini API (mimeType: ${mimeType}, toLang: ${toLang}, useRuby: ${useRuby})`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio
                }
              },
              {
                text: instruction
              }
            ]
          }],
          generationConfig: {
            temperature: 0.0,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                transcription: { type: "string" },
                translation: { type: "string" },
                detectedLanguage: { type: "string" }
              },
              required: ["transcription", "translation", "detectedLanguage"]
            }
          }
        }),
      }
    );

    const data = await response.json();
    console.log('Gemini Audio Translation Raw Response:', JSON.stringify(data));

    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let transcription = '';
    let translation = '';
    let detectedLanguage = '';
    if (generatedText) {
      try {
        const parsed = JSON.parse(generatedText.trim());
        transcription = parsed.transcription || '';
        translation = parsed.translation || '';
        detectedLanguage = parsed.detectedLanguage || '';

        // Post-processing: Remove duplicated sub-phrases from translation
        if (translation && translation.length > 10) {
          const clauses = translation.split(/(?<=[。！？!?，,])/);
          const seen = new Set<string>();
          const filtered: string[] = [];
          for (const clause of clauses) {
            const normalized = clause.replace(/[\s，,。！？!?]/g, '');
            if (!normalized) continue;
            if (!seen.has(normalized)) {
              seen.add(normalized);
              filtered.push(clause);
            }
          }
          translation = filtered.join('');
        }
      } catch (e) {
        console.warn('Failed to parse Gemini JSON response:', e);
        translation = generatedText.trim();
      }
    }

    let noSpeech = false;
    const cleanTrans = translation.trim();
    const cleanOrig = transcription.trim();
    if (!cleanTrans || !cleanOrig || cleanTrans.length < 3 || cleanOrig.length < 2) {
      console.warn(`Translate-Audio: Discarding incomplete/truncated response (orig: "${cleanOrig}", trans: "${cleanTrans}")`);
      noSpeech = true;
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
      noSpeech: noSpeech,
      originalText: transcription,
      translatedText: translation,
      detectedLanguage: detectedLanguage.toLowerCase(),
      model: 'gemini-2.5-flash',
    });
  } catch (error) {
    console.error('Audio Translation server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
