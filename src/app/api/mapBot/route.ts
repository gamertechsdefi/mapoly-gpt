import { NextRequest, NextResponse } from 'next/server';

interface SerperResult {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
}

function parseDate(dateStr?: string): number {
  if (!dateStr) return 0;

  const match = dateStr.toLowerCase().match(/(\d+)\s+(minute|hour|day|week)s?\s+ago/);
  if (match) {
    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);
    const now = new Date();
    switch (unit) {
      case 'minute': now.setMinutes(now.getMinutes() - amount); break;
      case 'hour': now.setHours(now.getHours() - amount); break;
      case 'day': now.setDate(now.getDate() - amount); break;
      case 'week': now.setDate(now.getDate() - amount * 7); break;
    }
    return now.getTime();
  }

  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
}

async function getLatestMapolyNews(apiKey: string): Promise<string> {
  const now = Date.now();
  const oneMonthAgo = now - 1000 * 60 * 60 * 24 * 30;

  const prompt = `MAPOLY Moshood Abiola Polytechnic news`;

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      q: prompt,
      gl: 'ng',
      hl: 'en',
      type: 'news',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Serper.dev failed: ${errText}`);
  }

  const data = await response.json();
  const rawResults: SerperResult[] = data.news || [];

  const withDates = rawResults.map(r => ({
    ...r,
    sortDate: parseDate(r.date),
  }));

  const recent = withDates
    .filter(r => r.sortDate >= oneMonthAgo)
    .sort((a, b) => b.sortDate - a.sortDate);

  const final = recent.length > 0 ? recent : withDates.slice(0, 5);

  return final
    .map((r, i) => {
      const dateStr = r.date ? `🗓️ ${r.date}\n` : '';
      return `${i + 1}. **${r.title}**\n${dateStr}${r.snippet || ''}\n[Read more](${r.link})`;
    })
    .join('\n\n') || 'No recent MAPOLY news found.';
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
  const rawResults: SerperResult[] = data.organic || [];

  const sortedResults = rawResults
    .map(result => ({ ...result, sortDate: parseDate(result.date) }))
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, 5);

  return sortedResults
    .map((r, i) => {
      const dateStr = r.date ? `🗓️ ${r.date}\n` : '';
      return `${i + 1}. **${r.title}**\n${dateStr}${r.snippet || ''}\n[Read more](${r.link})`;
    })
    .join('\n\n') || 'No relevant search results found.';
}

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

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const togetherApiKey = process.env.TOGETHER_API_KEY!;
    const serperApiKey = process.env.SERPER_API_KEY!;

    const prePrompt = `You are MapGPT, an AI assistant focused exclusively on Moshood Abiola Polytechnic (MAPOLY), Abeokuta, Nigeria. Use the following information to answer this MAPOLY-related question accurately:\n\n`;

    const lowerPrompt = prompt.toLowerCase();
    const isLatestQuery = ['latest', 'today', 'recent', 'happening now', 'news'].some(word =>
      lowerPrompt.includes(word)
    );

    const info = isLatestQuery
      ? await getLatestMapolyNews(serperApiKey)
      : await runSerperSearch(prompt, serperApiKey);

    const finalAnswer = await callTogetherAPI(`${prePrompt}${info}\n\nQuestion: ${prompt}`, togetherApiKey);

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
