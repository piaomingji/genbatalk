import { NextRequest, NextResponse } from 'next/server';
import { consumeDailyQuota, usageIdentity } from '@/lib/usage';
import { speechLocale } from '@/lib/languages';

export const runtime = 'nodejs';

/**
 * Reads a translation aloud.
 *
 * This used to call `translate.google.com/translate_tts` -- the endpoint behind the speaker button
 * on Google Translate. It is not a published API, it takes no voice or rate, and it sounds like it:
 * thin, flat and oddly high. Cloud Text-to-Speech is the real service, and its Neural2 and Chirp
 * voices are the natural ones. A million characters a month are free, and a translated sentence is
 * around fifty characters, so ordinary use costs nothing.
 *
 * The old endpoint is kept as a fallback rather than deleted. Until a key is configured -- and if
 * one is ever revoked, or the quota runs out -- speech keeps working instead of falling silent.
 */

/** Any key works if its project has the Text-to-Speech API enabled; the Gemini key often does. */
const API_KEY = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Which voice to prefer, best first.
 *
 * By family rather than by name, because names come and go. Studio voices are deliberately absent:
 * they are ten times the price of Neural2 and no better for reading one sentence aloud.
 */
const VOICE_FAMILIES = ['Chirp3-HD', 'Chirp-HD', 'Neural2', 'Wavenet', 'Standard'];

/** Resolved voice per locale. Serverless instances are reused, so this is asked for once each. */
const voiceCache = new Map<string, string | null>();

/**
 * Picks the best voice a locale actually offers.
 *
 * Asking Google what exists beats hard-coding a list of names that will drift out of date and fail
 * in exactly one language, silently, long after anyone remembers why. Sorted by name so a given
 * language always gets the same voice rather than a different one per server instance.
 */
async function bestVoiceFor(locale: string): Promise<string | null> {
  if (voiceCache.has(locale)) return voiceCache.get(locale)!;

  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?languageCode=${encodeURIComponent(locale)}&key=${API_KEY}`
    );
    if (!res.ok) throw new Error(`voices.list responded ${res.status}`);

    const { voices } = (await res.json()) as {
      voices?: Array<{ name: string; ssmlGender?: string }>;
    };
    const names = (voices || []).map(v => v.name).sort();

    const chosen =
      VOICE_FAMILIES.map(family => names.find(name => name.includes(family))).find(Boolean) ?? null;

    voiceCache.set(locale, chosen);
    if (!chosen) console.warn(`No Cloud TTS voice for ${locale}; falling back.`);
    return chosen;
  } catch (e) {
    console.error(`Could not list voices for ${locale}:`, e);
    // Not cached: a network blip should not disable the good voice until the next deploy.
    return null;
  }
}

/** The old unofficial endpoint. Thin and flat, but it needs no key and it works. */
async function legacySpeech(text: string, lang: string): Promise<Response> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
  return fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
  });
}

function mp3(body: ArrayBuffer | Buffer, source: string) {
  return new NextResponse(Buffer.from(body as ArrayBuffer), {
    headers: {
      'Content-Type': 'audio/mpeg',
      // The same sentence is often replayed by tapping the speaker icon.
      'Cache-Control': 'public, max-age=86400',
      'X-Speech-Source': source,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'en';

    if (!text) return new NextResponse('Text is required', { status: 400 });

    // The legacy endpoint becomes unreliable past a couple of hundred characters, and the client
    // splits sentences before asking, so anything this long did not come from a translation.
    if (text.length > 500) {
      return new NextResponse('Text too long', { status: 413 });
    }

    /**
     * How fast to speak, applied by the service rather than by replaying the audio faster.
     *
     * Changing playback speed on the client shifts the pitch with it, which is a good part of why
     * the voice sounded wrong: anything but exactly normal speed came out as a chipmunk or a drawl.
     */
    const rate = Math.min(Math.max(Number(searchParams.get('rate')) || 1, 0.5), 2);

    const { id } = await usageIdentity(req);
    if (!(await consumeDailyQuota('tts', id, 300))) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    if (API_KEY) {
      try {
        const locale = speechLocale(lang);
        const voice = await bestVoiceFor(locale);

        const res = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              // With no name, Google picks a voice for the locale by itself -- usually a plain one,
              // but better than refusing to speak a language whose voices we could not list.
              voice: voice ? { languageCode: locale, name: voice } : { languageCode: locale },
              audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
            }),
          }
        );

        if (res.ok) {
          const { audioContent } = (await res.json()) as { audioContent?: string };
          if (audioContent) return mp3(Buffer.from(audioContent, 'base64'), voice || locale);
          throw new Error('synthesize returned no audio');
        }

        // Worth saying out loud which of the two it is: a key that cannot reach the API at all reads
        // identically to a working one from the outside, because the fallback hides it.
        const detail = await res.text();
        console.error(`Cloud TTS refused (${res.status}): ${detail.slice(0, 300)}`);
      } catch (e) {
        console.error('Cloud TTS failed; falling back to the legacy voice:', e);
      }
    }

    const legacy = await legacySpeech(text, lang);
    if (!legacy.ok) {
      // The client falls back to the browser's own voice on any non-OK status.
      return new NextResponse('Speech unavailable', { status: legacy.status });
    }
    return mp3(await legacy.arrayBuffer(), 'legacy');
  } catch (error) {
    console.error('TTS route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
