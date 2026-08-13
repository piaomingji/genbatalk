import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured on the server');
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes expiration
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute window to connect

    const tokenUrl = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate ephemeral token from Google:', errorText);
      return NextResponse.json({ error: `Google API Error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const token = data.token || data.name;
    if (!token) {
      console.error('Token/Name not found in Google response:', data);
      return NextResponse.json({ error: 'Token field missing in Google response' }, { status: 500 });
    }

    console.log('Successfully generated ephemeral token for Gemini Live Session');
    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Error generating ephemeral session token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
