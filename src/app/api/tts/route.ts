import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

    // Rate Limiting via Vercel KV
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const ipKey = `genbatalk:rate:${ip}`;
    let currentIpCount = 0;
    
    try {
      currentIpCount = (await kv.get<number>(ipKey)) || 0;
      if (currentIpCount >= 50) {
        return new NextResponse('Rate limit exceeded', { status: 429 });
      }
    } catch (e) {
      console.warn('Vercel KV not connected yet, skipping rate limit check:', e);
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

    // Increment KV Rate Limit Counter
    try {
      if (currentIpCount === 0) {
        await kv.set(ipKey, 1, { ex: 24 * 60 * 60 });
      } else {
        const ttl = await kv.ttl(ipKey);
        await kv.set(ipKey, currentIpCount + 1, ttl > 0 ? { ex: ttl } : { ex: 24 * 60 * 60 });
      }
    } catch (e) {}

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
