import { NextResponse } from 'next/server';

const LANG_NAMES = {
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script, Marathi vocabulary — Hindi shabdon se mix mat karo)',
  en: 'English',
};

// OpenRouter par jo model use karna hai (OpenAI-compatible slug format)
const MODEL = 'anthropic/claude-sonnet-4.6';

function buildPrompt(lang, part) {
  const langName = LANG_NAMES[lang] || LANG_NAMES.hi;
  const base = `Tum ek dost jaisa, encouraging Indian school teacher ho. Neeche diye gaye book chapter (photo ya text) ko dhyaan se padho.

Chapter kisi bhi bhasha me ho, tumhara PUURA jawab STRICTLY ${langName} me hona chahiye — simple, aasan shabdon me, jaise ek dost samjha raha ho.

SIRF JSON return karo, kuch aur text nahi (no preamble, no markdown fences). Concise raho.`;

  if (part === 1) {
    return `${base}

{
  "topic": "chapter ka chhota sa title (2-5 words)",
  "summary": ["chhota point 1 (1-2 lines, aasan bhasha)", "chhota point 2", "... total 4 se 5 points"],
  "questions": [{"q":"exam-relevant sawal", "a":"seedha, saaf jawab (1-2 lines)"}, "... total 4 se 5 questions"]
}`;
  }

  return `${base} "narration" text especially natural bol-chaal wali ${langName} me likho, kyunki wo text-to-speech se bola jayega.

{
  "flashcards": [{"front":"chhota sawal ya term", "back":"chhota jawab ya definition, yaad rakhne layak"}, "... total 5 se 6 cards"],
  "video_slides": [{"heading":"chhota slide title (3-6 words)", "narration":"jaise teacher bol ke samjha raha ho, 1-2 lines, bolne layak natural sentence", "emoji":"ek relevant emoji"}, "... total 4 se 5 slides, jo poore chapter ko order se cover karein"]
}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, lang, part, imageBase64, imageMediaType, docExtractedText, textInput } = body;
    const partNum = part === 2 ? 2 : 1;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Server par OPENROUTER_API_KEY set nahi hai.' },
        { status: 500 }
      );
    }

    const contentParts = [];
    const promptText = buildPrompt(lang, partNum);

    if (mode === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'Pehle chapter ki photo chuno.' }, { status: 400 });
      }
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
      });
      contentParts.push({ type: 'text', text: promptText });
    } else if (mode === 'doc') {
      if (!docExtractedText) {
        return NextResponse.json(
          { error: 'Pehle Word ya Excel file chuno (PDF ke liye abhi Photo mode use karo — chapter ki photo khींchke upload karo).' },
          { status: 400 }
        );
      }
      contentParts.push({ type: 'text', text: promptText + '\n\nChapter text:\n' + docExtractedText });
    } else {
      if (!textInput || !textInput.trim()) {
        return NextResponse.json({ error: 'Pehle chapter ka text paste karo.' }, { status: 400 });
      }
      contentParts.push({ type: 'text', text: promptText + '\n\nChapter text:\n' + textInput });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
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
