import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080';

    const response = await fetch(`${backendUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Backend AI error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json(
      data.content ? data : { content: [{ type: 'text', text: data.response || 'No response' }] }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
