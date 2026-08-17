import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Retired along with the custom glossary editor.
export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed.' }, { status: 410 });
}
