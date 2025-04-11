import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';

async function fetchMapolyBlogNews(): Promise<string> {
  try {
    // Hypothetical Mapoly blog URL - replace with actual URL
    const url = 'https://www.myschoolgist.com/ng/tag/www-mapoly-edu-ng/';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Example scraping logic - adjust based on actual blog structure
    const articles = $('article')
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

    // Define multiple contexts with keywords and details
    const contexts: Record<
      string,
      { keywords: string[]; details: string }
    > = {
      computerScience: {
        keywords: [
          'computer science',
          'cs',
          'hod',
          'orunsholu',
          'bus shed',
          'computer department',
        ],
        details:
          'At Mapoly, the Computer Science HOD is Dr. Orunsholu, and the Computer Science department is located opposite the bus shed area.',
      },
      electricalEngineering: {
        keywords: [
          'electrical engineering',
          'ee',
          'electrical department',
          'main gate',
        ],
        details:
          'At Mapoly, the Electrical Engineering HOD is Dr. Smith, and the department is located near the main gate.',
      },
      library: {
        keywords: ['library', 'books', 'study area'],
        details:
          'The Mapoly library is centrally located near the admin block and offers a wide range of academic resources.',
      },
      admissions: {
        keywords: ['admission', 'apply', 'enrollment', 'jamb'],
        details:
          'Mapoly’s admission process requires a JAMB score, online application via the Mapoly portal, and screening at the campus.',
      },
    };

    // Check if the prompt is asking for Mapoly news or information
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

    // Find matching contexts
    let additionalContext = '';
    for (const [topic, { keywords, details }] of Object.entries(contexts)) {
      if (keywords.some((keyword) => lowerPrompt.includes(keyword))) {
        additionalContext += `${details} `;
      }
    }

    // Combine prompt with additional context (if any)
    const finalPrompt = additionalContext
      ? `${prompt}. ${additionalContext.trim()}`
      : prompt;

    // Call the Grok API with the final prompt
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