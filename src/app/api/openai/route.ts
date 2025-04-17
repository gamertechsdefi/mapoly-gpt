import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import cheerio from 'cheerio';
import generalData from './data/general.json';

// Embedded Computer Science department data
const computerScienceData = {
  department_name: "Computer Science",
  location: "ICT Center, opposite the bus shed area",
  vision: "To be the leading technology department in the world",
  past_events: [
    "Project & Seminar Defense Supervision for Academic Staffs in the department on 26th march 2025",
    "New ICT center launched on campus.",
    "2025 Matriculation holds on May 5th."
  ],
  future_events: [
    "Project and seminar orientation for students in ND II & HND II on 23rd of April, 2025",
    "Release of dedicated account of payment of departmental projects dues 2025 on 25th of April, 2025",
    "Release of guiding materials for seminar writing and project implementation for 2025 on 27th of April, 2025.",
    "Project topics proposal and seminar titles submission and defense on May 5th to 7th, 2025",
    "Release of approved project and seminar works and commencement on May 8th, 2025"
  ],
  direction: "when you get to the school gate, take a bike or cab to bus shed. hightlight there and look opposite to your left and you did see the ICT center",
  number_of_lecturers:"there are 15 lecturers in the computer science department",
  current_head_of_department: "Dr. Orunsholu",
  previous_head_of_department: "Mr. Adebayo A. A.",
  courses_offered_in_ND1: "8 courses",
  courses_offered_in_ND2: "10 courses",
  courses_offered_in_HND1: "12 courses",
  courses_offered_in_HND2: "14 courses",
  website_link: "https://www.nacosmapoly.com",
  head_of_class_HND2: "Blessing CEO",
  assistant_head_of_class_HND2: "Drey",
  president: "Master Oladele Philip popluarly known as Code Doctor, but can't debug a thing",
  vice_president1: "Marklin Mayowa, also known as Mayor. He is the Vice President 1",
  vice_president2: "Oloyede Ademola",
  general_secretary: "Olasupo Kayode, popularly known as Kay",
  software_director: "Afolabi Abayomi, popularly known as Afoo",
  social_director: "Rabiu Kabiru, called Dinero by the gees",
  sport_director: "Olaniran Isaac",
  public_relation_officers: "Emmanuel Victory and Joseph Benjamin",
  financial_secretary: "Ogunjobi Joshua",
  welfare_officer: "Olusola Grace",
  treasurer: "Emokpae Shukurat",
  image_url: [
    "/assets/general pics.png"
  ],
}; 

async function fetchMapolyBlogNews(): Promise<string> {
  try {
    const url = 'https://www.myschoolgist.com/ng/tag/www-mapoly-edu-ng/';
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

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

function includesDept(prompt: string, dept: string): boolean {
  const aliases: { [key: string]: string[] } = {
    'computer science': ['computer science', 'cs', 'comp sci', 'computer dept'],
    'business administration': ['business administration', 'biz admin'],
    'electrical engineering': ['electrical engineering', 'ee', 'elect eng'],
  };
  return aliases[dept.toLowerCase()].some((alias) =>
    prompt.toLowerCase().includes(alias)
  );
}

async function getDepartmentData(department: string) {
  // Return embedded data for Computer Science
  if (department.toLowerCase() === 'computer science') {
    return computerScienceData;
  }

  // For other departments, return null (or add file-based logic if needed later)
  console.warn(`No data available for department: ${department}`);
  return null;
}

async function callGrok3API(prompt: string, apiKey: string, systemPrompt: string): Promise<string> {
  const apiEndpoint = 'https://api.x.ai/v1/chat/completions';

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
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
    console.error('Error calling xAI API:', error);
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
      throw new Error('XAI_API_KEY not set in environment. Visit https://x.ai/api for API details.');
    }

    const departments = ['computer science', 'business administration', 'electrical engineering'];
    const matchedDept = departments.find((dept) => includesDept(prompt, dept));
    const departmentData = matchedDept ? await getDepartmentData(matchedDept) : null;

    console.log('Prompt:', prompt);
    console.log('Matched Dept:', matchedDept);
    console.log('Department Data:', departmentData);

    const systemPrompt = `
You are a helpful assistant providing accurate information about ${generalData.school_name} located in ${generalData.location}.
Vision: ${generalData.vision}

Recent updates:
${generalData.recent_updates.map((item, i) => `${i + 1}. ${item}`).join('\n')}

${departmentData ? `
Department: ${departmentData.department_name}
Location: ${departmentData.location}
Vision: ${departmentData.vision}
Current HOD: ${departmentData.current_head_of_department}
Previous HOD: ${departmentData.previous_head_of_department}
Courses Offered:
- ND1: ${departmentData.courses_offered_in_ND1}
- ND2: ${departmentData.courses_offered_in_ND2}
- HND1: ${departmentData.courses_offered_in_HND1}
- HND2: ${departmentData.courses_offered_in_HND2}
Past Events:
${departmentData.past_events.map((event, i) => `${i + 1}. ${event}`).join('\n')}
Future Events:
${departmentData.future_events.map((event, i) => `${i + 1}. ${event}`).join('\n')}
Website: ${departmentData.website_link}
Number of Lecturers: ${departmentData.number_of_lecturers}
direction: ${departmentData.direction}
hoc HND2: ${departmentData.head_of_class_HND2}
assistant hoc HND2: ${departmentData.assistant_head_of_class_HND2}
departmental president: ${departmentData.president}
departmental vice president 1: ${departmentData.vice_president1}
departmental vice president 2: ${departmentData.vice_president2}
departmental treasurer: ${departmentData.treasurer}
departmental general secretary: ${departmentData.general_secretary}
departmental software director: ${departmentData.software_director}
departmental sport director: ${departmentData.sport_director}
departmental software director: ${departmentData.software_director}

` : ''}
`.trim();

    console.log('System Prompt:', systemPrompt);

    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('mapoly') && (lowerPrompt.includes('news') || lowerPrompt.includes('updates'))) {
      const news = await fetchMapolyBlogNews();
      return NextResponse.json({ response: news });
    }

    const grokResponse = await callGrok3API(prompt, apiKey, systemPrompt);
    return NextResponse.json({ response: grokResponse });

  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process request',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}