import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Retired along with the cross-device sync channel. The app now works on a single device: both
// speakers take turns on the same screen, so there is nothing to share between clients.
export async function GET() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 410 });
}
