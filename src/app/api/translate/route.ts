import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, fromLang, toLang } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Translation dictionary for simulated construction/on-site phrases
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
      },
      ja_en: {
        'ヘルメットを着用してください': 'Please wear your safety helmet.',
        '足元に注意して作業してください': 'Please watch your step while working.',
        '本日の作業は終了です': 'Today\'s work is finished.',
        'お疲れ様でした': 'Thank you for your hard work.',
        '手伝ってください': 'Please help me.',
        '分かりました': 'I understand.',
      },
      en_ja: {
        'please wear your safety helmet.': 'ヘルメットを着用してください。',
        'please watch your step while working.': '足元に注意して作業してください。',
        'today\'s work is finished.': '本日の作業は終了です。',
        'thank you for your hard work.': 'お疲れ様でした。',
        'please help me.': '手伝ってください。',
        'i understand.': '分かりました。',
      }
    };

    let translation = '';
    const key = `${fromLang}_${toLang}`;
    const cleanText = text.trim().replace(/[。、.!?]/g, '').toLowerCase();

    // Try finding in dictionary
    if (simulatedTranslations[key] && simulatedTranslations[key][cleanText]) {
      translation = simulatedTranslations[key][cleanText];
    } else {
      // Fallback fallback generator
      const prefix = toLang === 'vi' ? '[Dịch] ' : toLang === 'en' ? '[Translate] ' : '[翻訳] ';
      translation = `${prefix}${text}`;
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText: translation,
      model: 'gemini-3.5-live-translate-preview',
    });
  } catch (error) {
    console.error('Translation simulation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
