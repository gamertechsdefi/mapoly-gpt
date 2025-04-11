// app/api/grok/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';

// interface Message {
//   role: 'user' | 'assistant';
//   content: string;
// }

async function fetchMapolyBlogNews(): Promise<string> {
  try {
    // Hypothetical Mapoly blog URL - replace with actual URL
    const url = 'https://www.myschoolgist.com/ng/tag/www-mapoly-edu-ng/'; // Adjust this!
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Example scraping logic - adjust based on actual blog structure
    const articles = $('article') // Assuming blog posts are in <article> tags
      .map((i, el) => {
        const title = $(el).find('h2').text().trim() || 'No title';
        const summary = $(el).find('p').first().text().trim() || 'No summary';
        const link = $(el).find('a').attr('href') || url;
        return `${i + 1}. **${title}**: ${summary} [Read more](${link})`;
      })
      .get()
      .join('\n');

    return articles || 'No recent news found on the Mapoly blog.';
  } catch (error) {
    console.error('Error fetching Mapoly blog:', error);
    return 'Failed to fetch news from the Mapoly blog.';
  }
}

async function callGrokAPI(userPrompt: string, apiKey: string) {
  const systemPrompt = `
    You are a bot that only knows about Moshood Abiola Polytechnic (MAPOLY), Abeokuta. 
    If the question is not related to MAPOLY (e.g., news, history, courses), respond with:
    'I'm sorry, I can only answer questions about Moshood Abiola Polytechnic, Abeokuta.'
    Otherwise, answer the following question:
  `.trim();

  const response = await fetch('https://api.x.ai/grok', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content; // Assuming response format matches xAI API
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Check if the prompt is asking for Mapoly news or information
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('mapoly') && (lowerPrompt.includes('news') || lowerPrompt.includes('information') || lowerPrompt.includes('updates'))) {
      const news = await fetchMapolyBlogNews();
      return NextResponse.json({ response: news });
    }

    // Otherwise, call the Grok API
    const grokResponse = await callGrokAPI(prompt, apiKey);
    return NextResponse.json({ response: grokResponse });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process request',
      details: error instanceof Error ? error.stack : undefined 
    }, { status: 500 });
  }
}