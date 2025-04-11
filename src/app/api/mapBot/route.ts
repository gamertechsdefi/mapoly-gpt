import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';

async function fetchMapolyBlogNews(): Promise<string> {
  try {
    const url = 'https://www.myschoolgist.com/ng/tag/www-mapoly-edu-ng/';
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);

    const articles = $('.post')
      .map((i, el) => {
        const title = $(el).find('.entry-title a').text().trim() || 'No title';
        const summary =
          $(el).find('.entry-content p').first().text().trim() || 'No summary';
        const link = $(el).find('.entry-title a').attr('href') || url;
        return `${i + 1}. **${title}**: ${summary} [Read more](${link})`;
      })
      .get()
      .slice(0, 5)
      .join('\n');

    return articles || 'No recent news found on the Mapoly blog.';
  } catch (error) {
    console.error('Error fetching Mapoly blog:', error);
    return 'Failed to fetch news from the Mapoly blog. Please try again later.';
  }
}

async function callGrokAPI(prompt: string, apiKey: string): Promise<string> {
  const apiEndpoint = 'https://api.x.ai/v1/chat/completions';
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${responseText}`
      );
    }
    if (!contentType?.includes('application/json')) {
      const responseText = await response.text();
      throw new Error(
        `Unexpected response type: ${contentType}. Body: ${responseText}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Error calling Grok API:', error);
    throw error;
  }
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

    const lowerPrompt = prompt.toLowerCase();
    if (
      lowerPrompt.includes('mapoly') &&
      (lowerPrompt.includes('news') ||
        lowerPrompt.includes('information') ||
        lowerPrompt.includes('updates'))
    ) {
      const news = await fetchMapolyBlogNews();
      return NextResponse.json({ response: news });
    }

    const contexts = {
      computerScienceHOD: `
        At Moshood Abiola Polytechnic (MAPOLY), the Computer Science department is led by Dr. Orunsholu as the Head of Department (HOD).`,
      computerScienceLocation: `
        It is located opposite the bus shed area on campus.
      `,
      computerScienceRooms: `
        There are 12 rooms in the computer science department.
      `,
      computerScienceFormerHOD: `
        The former HOD name is Mr. Adebayo
      `,
      sugman: `
        Sugman is the nickname for Mr. Adebesin, one of the top lecturers in the Computer Science department
      `,
    };

    let finalPrompt = prompt;
    if (lowerPrompt.includes('computer science')) {
      const csContext = [
        contexts.computerScienceHOD,
        contexts.computerScienceLocation,
        contexts.computerScienceRooms,
        contexts.computerScienceFormerHOD,
        contexts.sugman,
      ].join(' ');
      finalPrompt = `${prompt}. Additional context: ${csContext}`;
    } else if (lowerPrompt.includes('electrical')) {
      finalPrompt = prompt; // No context for electrical yet
    }

    const grokResponse = await callGrokAPI(finalPrompt, apiKey);
    return NextResponse.json({ response: grokResponse });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}