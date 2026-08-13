import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    // Call Gemini API to extract terms
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze the following document text. Identify all key specialized terminology, product names, tools, industrial jargon, or security warnings.
Translate each identified Japanese term into the target language code "${targetLang}".
Document Text:
${text}`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              description: 'List of extracted glossary terms with translations',
              items: {
                type: 'OBJECT',
                properties: {
                  ja: { type: 'STRING', description: 'The original Japanese term found in the text' },
                  translation: { type: 'STRING', description: 'The translated term in the target language' },
                  lang: { type: 'STRING', description: 'The target language code, e.g. en, zh, vi, ko' }
                },
                required: ['ja', 'translation', 'lang']
              }
            }
          },
          systemInstruction: {
            parts: [
              {
                text: `You are an expert terminology extraction assistant for multilingual construction and industrial translation.
Your task is to parse documents and output a structured list of custom glossary terms.
For each term you find, provide the original Japanese term (ja), its translation, and the target language code.
Ensure all lang properties match exactly the requested target language code.`
              }
            ]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error during term extraction:', errorText);
      return NextResponse.json({ error: 'Gemini extraction API failed' }, { status: 500 });
    }

    const resData = await response.json();
    const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json({ terms: [] });
    }

    // Parse the structured JSON response from Gemini
    const terms = JSON.parse(generatedText);
    return NextResponse.json({ success: true, terms });
  } catch (e) {
    console.error('API /api/extract-terms failed:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
