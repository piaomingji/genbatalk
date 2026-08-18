import { NextRequest, NextResponse } from 'next/server';
import {
  DAILY_SESSION_LIMIT,
  DEVICE_COOKIE,
  addSession,
  usageIdentity,
  isExhausted,
  readUsage,
} from '@/lib/usage';

export const runtime = 'nodejs';

/**
 * Issues a short-lived ephemeral token so the browser can open a Live API WebSocket without ever
 * seeing our GEMINI_API_KEY.
 *
 * The app opens TWO simultaneous translation sessions (one per direction), and each session needs
 * its own connection, so `uses` allows for that plus a little slack for reconnects when the
 * worker's language changes mid-conversation.
 *
 * `lockAdditionalFields: []` deliberately leaves `translationConfig` unlocked so the client can set
 * `targetLanguageCode` per session. Without this, Google locks the config at token-creation time
 * and both sessions would be forced to translate into the same language.
 */
export async function POST(req: NextRequest) {
  try {
    // The browser cannot reach Google without one of these tokens, so this is the chokepoint where
    // free usage is capped. Check before spending anything.
    const { id, ip, isNew, isPaid, allowance } = await usageIdentity(req);
    const usage = await readUsage(id, ip);

    // Blocked when either this device or its IP address has run out for the day.
    if (isExhausted(usage, { allowance, isPaid })) {
      return NextResponse.json(
        {
          error: 'daily_limit',
          limitSeconds: allowance,
          usedSeconds: usage.seconds,
        },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured on the server');
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 min to connect

    const tokenUrl = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Two sessions per conversation, plus a little slack for a mid-conversation language
        // change. Kept tight so a single token cannot fund an unbounded number of connections.
        uses: 4,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: 'models/gemini-3.5-live-translate-preview',
          config: {
            responseModalities: ['AUDIO'],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
        lockAdditionalFields: [],
      }),
    });

    let effective = response;
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Constrained token request rejected by Google:', errorText);

      // Retry without the constraints. The connection still works -- the client just supplies the
      // full config itself -- and this keeps a config-shape rejection from bricking the app.
      const retry = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uses: 8, expireTime, newSessionExpireTime }),
      });

      if (!retry.ok) {
        const retryText = await retry.text();
        console.error('Plain token request also rejected:', retryText);
        return NextResponse.json(
          { error: `Google API Error: ${retryText.slice(0, 400)}` },
          { status: retry.status }
        );
      }
      console.warn('Falling back to an unconstrained ephemeral token.');
      effective = retry;
    }

    const data = await effective.json();
    const token = data.token || data.name;
    if (!token) {
      console.error('Token/Name not found in Google response:', data);
      return NextResponse.json({ error: 'Token field missing in Google response' }, { status: 500 });
    }

    await addSession(id, ip);

    const res = NextResponse.json({
      token,
      deviceId: id,
      limitSeconds: allowance,
      usedSeconds: usage.seconds,
    });
    if (isNew) {
      res.cookies.set(DEVICE_COOKIE, id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }
    return res;
  } catch (error: any) {
    console.error('Error generating ephemeral session token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
