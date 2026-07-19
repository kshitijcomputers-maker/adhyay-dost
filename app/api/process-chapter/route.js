import { NextResponse } from 'next/server';

const LANG_NAMES = {
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script, Marathi vocabulary — Hindi shabdon se mix mat karo)',
  en: 'English',
};

// OpenRouter par jo model use karna hai (OpenAI-compatible slug format)
const MODEL = 'anthropic/claude-sonnet-4.6';

function buildPrompt(lang) {
  const langName = LANG_NAMES[lang] || LANG_NAMES.hi;
  return `Tum ek dost jaisa, encouraging Indian school teacher ho. Neeche diye gaye book chapter (photo ya text) ko dhyaan se padho aur ek student ke liye study material taiyaar karo.

Chapter kisi bhi bhasha me ho, tumhara PUURA jawab STRICTLY ${langName} me hona chahiye — simple, aasan shabdon me, jaise ek dost samjha raha ho. "narration" wale text especially natural bol-chaal wali ${langName} me likho, kyunki wo text-to-speech se bola jayega.

SIRF ye JSON format return karo, kuch aur text nahi (no preamble, no markdown fences):
{
  "topic": "chapter ka chhota sa title (2-5 words)",
  "summary": ["chhota point 1 (2-3 lines, aasan bhasha)", "chhota point 2", "... 5 se 8 points"],
  "questions": [{"q":"exam-relevant sawal", "a":"seedha, saaf jawab (2-4 lines)"}, "... 5 se 8 questions"],
  "flashcards": [{"front":"chhota sawal ya term", "back":"chhota jawab ya definition, yaad rakhne layak"}, "... 6 se 10 cards"],
  "video_slides": [{"heading":"chhota slide title (3-6 words)", "narration":"jaise teacher bol ke samjha raha ho, 2-4 lines, bolne layak natural sentence", "emoji":"ek relevant emoji"}, "... 5 se 8 slides, jo poore chapter ko order se cover karein"]
}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, lang, imageBase64, imageMediaType, docExtractedText, textInput } = body;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Server par OPENROUTER_API_KEY set nahi hai.' },
        { status: 500 }
      );
    }

    // OpenAI-compatible "content" array banate hain
    const contentParts = [];

    if (mode === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Pehle chapter ki photo chuno.' }, { status: 400 });
      }
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
      });
      contentParts.push({ type: 'text', text: buildPrompt(lang) });
    } else if (mode === 'doc') {
      if (!docExtractedText) {
        return NextResponse.json(
          { error: 'Pehle Word ya Excel file chuno (PDF ke liye abhi Photo mode use karo — chapter ki photo khींchke upload karo).' },
          { status: 400 }
        );
      }
      contentParts.push({
        type: 'text',
        text: buildPrompt(lang) + '\n\nChapter text:\n' + docExtractedText,
      });
    } else {
      if (!textInput || !textInput.trim()) {
        return NextResponse.json({ error: 'Pehle chapter ka text paste karo.' }, { status: 400 });
      }
      contentParts.push({
        type: 'text',
        text: buildPrompt(lang) + '\n\nChapter text:\n' + textInput,
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: contentParts }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'AI se jawab nahi mila.' },
        { status: 502 }
      );
    }

    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      return NextResponse.json({ error: 'AI se text response nahi mila.' }, { status: 502 });
    }

    const clean = rawText.replace(/```json|```/g, '').trim();
    let resultData;
    try {
      resultData = JSON.parse(clean);
    } catch (e) {
      return NextResponse.json({ error: 'AI ka jawab samajh nahi aaya, dobara try karo.' }, { status: 502 });
    }

    return NextResponse.json({ resultData });
  } catch (err) {
    console.error('process-chapter error:', err);
    return NextResponse.json({ error: 'Kuch gadbad ho gayi, dobara try karo.' }, { status: 500 });
  }
}
