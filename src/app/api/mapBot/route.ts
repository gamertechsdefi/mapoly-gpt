import { NextRequest, NextResponse } from 'next/server';

async function callTogetherAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3-70b-chat-hf',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

async function runSerperSearch(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: prompt, gl: 'ng', hl: 'en' }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Serper.dev failed: ${errText}`);
  }

  const data = await response.json();
  const results = data.organic?.slice(0, 5) || [];

  return results
    .map((r: any, i: number) => {
      const dateStr = r.date ? `🗓️ ${r.date}\n` : '';
      return `${i + 1}. **${r.title}**\n${dateStr}${r.snippet || ''}\n[Read more](${r.link})`;
    })
    .join('\n\n') || 'No relevant search results found.';
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const togetherApiKey = process.env.TOGETHER_API_KEY!;
    const serperApiKey = process.env.SERPER_API_KEY!;

    // 🧠 Pre-prompt to assume MAPOLY context
    const prePrompt = `You are MapGPT, an AI assistant focused exclusively on Moshood Abiola Polytechnic (MAPOLY), Abeokuta, Nigeria. Use the following information to answer this MAPOLY-related question accurately:\n\n`;

    const searchResults = await runSerperSearch(prompt, serperApiKey);

    const finalAnswer = await callTogetherAPI(
      `${prePrompt}${searchResults}\n\nQuestion: ${prompt}`,
      togetherApiKey
    );

    return NextResponse.json({ response: finalAnswer });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
