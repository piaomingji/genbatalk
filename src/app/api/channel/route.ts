import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

const MAX_MESSAGES = 500;
const MAX_STRING_LEN = 4000;

// Defense-in-depth: this room "channel" has no authentication, so anything posted here
// (from any device that knows the roomId) ends up rendered in every other participant's
// browser (see Timeline.tsx). Coerce shapes/lengths here; HTML sanitization happens on
// the render side, this just prevents obviously malformed/oversized payloads from being
// stored.
interface ChannelMessage {
  id: string;
  sender: 'staff' | 'worker';
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: string;
}

function sanitizeMessage(m: unknown): ChannelMessage | null {
  if (!m || typeof m !== 'object') return null;
  const obj = m as Record<string, unknown>;
  const id = typeof obj.id === 'string' && obj.id ? obj.id.slice(0, 100) : null;
  if (!id) return null;
  const clip = (v: unknown, len = MAX_STRING_LEN) => (typeof v === 'string' ? v.slice(0, len) : '');
  return {
    id,
    sender: obj.sender === 'staff' || obj.sender === 'worker' ? obj.sender : 'worker',
    originalText: clip(obj.originalText),
    translatedText: clip(obj.translatedText),
    fromLang: clip(obj.fromLang, 10),
    toLang: clip(obj.toLang, 10),
    timestamp: obj.timestamp ? clip(String(obj.timestamp), 40) : new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const key = `genbatalk:room:${roomId}`;

    // Check if KV is connected (to prevent crash if not configured in Vercel dashboard yet)
    let messages: ChannelMessage[] = [];
    try {
      messages = (await kv.get<ChannelMessage[]>(key)) || [];
    } catch (e) {
      console.warn('Vercel KV not connected yet, falling back to empty list:', e);
    }

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Fetch channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roomId = body?.roomId;
    const incomingRaw = body?.messages;

    if (!roomId || typeof roomId !== 'string' || !Array.isArray(incomingRaw)) {
      return NextResponse.json({ error: 'Room ID and messages are required' }, { status: 400 });
    }

    const incoming = incomingRaw.map(sanitizeMessage).filter((m): m is ChannelMessage => m !== null);
    const key = `genbatalk:room:${roomId}`;

    try {
      // Merge by message id instead of blindly overwriting. Two devices posting to the same
      // room around the same time used to race here: whichever POST landed last on the KV
      // store would silently wipe out the other device's message. Reading the current value
      // and merging (incoming wins per-id, which also covers in-place message edits) fixes
      // the common case; it is not a fully atomic compare-and-swap, but for this low-frequency
      // 1-second-poll chat use case it eliminates the practical data loss.
      const existing = (await kv.get<ChannelMessage[]>(key)) || [];
      const merged = new Map<string, ChannelMessage>();
      for (const m of existing) {
        if (m && typeof m.id === 'string') merged.set(m.id, m);
      }
      for (const m of incoming) {
        merged.set(m.id, m);
      }

      const mergedArr = Array.from(merged.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-MAX_MESSAGES);

      // Save with 2 hours expiration (7200 seconds) to prevent infinite Redis storage bloat
      await kv.set(key, mergedArr, { ex: 7200 });
    } catch (e) {
      console.warn('Vercel KV not connected yet, write ignored:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Publish channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const key = `genbatalk:room:${roomId}`;
    try {
      await kv.del(key);
    } catch (e) {
      console.warn('Vercel KV not connected yet, delete ignored:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
