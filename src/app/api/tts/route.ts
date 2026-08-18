import { NextRequest, NextResponse } from 'next/server';
import { consumeDailyQuota, usageIdentity } from '@/lib/usage';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'en';

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    // Google's unofficial translate_tts endpoint silently fails (or returns broken audio) for
    // long input — it was never meant to be called programmatically and has no documented
    // limit, but in practice requests beyond ~200 characters are unreliable. Reject early with
    // a clear status instead of letting the client wait on a request likely to fail; playSpeech()
    // on the client already falls back to the Web Speech API (no length limit) whenever this
    // proxy responds with a non-OK status.
    if (text.length > 200) {
      return new NextResponse('Text too long for TTS proxy; use client-side speech synthesis fallback', { status: 413 });
    }

    const { id } = await usageIdentity(req);
    if (!(await consumeDailyQuota('tts', id, 300))) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch TTS', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('TTS proxy route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
