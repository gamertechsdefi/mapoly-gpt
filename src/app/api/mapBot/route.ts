// app/api/grok/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';

async function fetchMapolyBlogNews(): Promise<string> {
  try {
    // Use official MAPOLY website or news page - adjust as needed
    const url = 'https://mapoly.edu.ng';
    const response = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(response.data);

    // Adjust selectors based on actual site structure
    const articles = $('article, .news-item, .post') // Common news containers
      .map((i, el) => {
        const title = $(el).find('h1, h2, .title').text().trim() || 'No title';
        const summary = $(el).find('p, .summary').first().text().trim() || 'No summary';
        const link = $(el).find('a').attr('href') || url;
        return `${i + 1}. **${title}**: ${summary} [Read more](${link})`;
      })
      .get()
      .slice(0, 5) // Limit to 5 articles
      .join('\n');

    return articles || 'No recent news found on the MAPOLY website. Visit https://mapoly.edu.ng for updates.';
  } catch (error) {
    console.error('Error fetching MAPOLY blog:', error);
    return 'Failed to fetch news from the MAPOLY website. Please try again later.';
  }
}

async function callGrokAPI(prompt: string, apiKey: string): Promise<string> {
  const systemPrompt = `
    You are a bot that only knows about Moshood Abiola Polytechnic (MAPOLY), Abeokuta. 
    If the question is not related to MAPOLY (e.g., news, history, courses), respond with:
    'I'm sorry, I can only answer questions about Moshood Abiola Polytechnic, Abeokuta.'
    Otherwise, answer the following question:
  `.trim();

  try {
    const response = await fetch('https://api.x.ai/grok', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // Fixed interpolation
      },
      body: JSON.stringify({
        model: 'grok-beta', // Updated model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }),
    });

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }
    if (!contentType?.includes('application/json')) {
      throw new Error(`Unexpected response type: ${contentType}. Body: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Grok API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Please provide a valid prompt about Moshood Abiola Polytechnic, Abeokuta.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      throw new Error('GROK_API_KEY not configured in environment variables.');
    }

    const lowerPrompt = prompt.toLowerCase().trim();

    // Handle help command
    if (['help', 'commands', 'what can you do'].includes(lowerPrompt)) {
      const helpMessage = `
I am a bot that only knows about Moshood Abiola Polytechnic (MAPOLY), Abeokuta. I can answer questions about:
- MAPOLY news or updates
- MAPOLY history
- MAPOLY courses
- General information about MAPOLY

Examples:
- "Tell me about MAPOLY news"
- "What is the history of MAPOLY?"
- "What courses does MAPOLY offer?"

Please ask something related to MAPOLY.
      `.trim();
      return NextResponse.json({ response: helpMessage });
    }

    // Check for MAPOLY news/updates/information
    if (lowerPrompt.includes('mapoly') && (lowerPrompt.includes('news') || lowerPrompt.includes('information') || lowerPrompt.includes('updates'))) {
      const news = await fetchMapolyBlogNews();
      return NextResponse.json({ response: news });
    }

    // Preliminary MAPOLY keyword check to save API costs
    const mapolyKeywords = ['mapoly', 'moshood abiola polytechnic', 'abeokuta'];
    const isMapolyRelated = mapolyKeywords.some((keyword) => lowerPrompt.includes(keyword));
    if (!isMapolyRelated) {
      return NextResponse.json(
        {
          response: "I'm sorry, I can only answer questions about Moshood Abiola Polytechnic, Abeokuta."
        },
        { status: 200 } // 200 for valid request, not an error
      );
    }

    // Call Grok API for MAPOLY-related prompts
    const grokResponse = await callGrokAPI(prompt, apiKey);
    return NextResponse.json({ response: grokResponse });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET handler for debugging
export async function GET() {
  return NextResponse.json({
    message: 'This is the /api/grok endpoint. Use POST with a JSON body containing a "prompt" field.',
  });
}