import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Retired. Audio is translated over the Live Translation websocket (see src/lib/liveTranslate.ts);
// this route also carried the construction-site glossary, which no longer applies now that the app
// is a general-purpose translator.
export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 410 });
}
