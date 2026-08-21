import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subPath = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/stream/${subPath}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!backendRes.ok || !backendRes.body) {
      return new Response(JSON.stringify({ error: 'Failed to connect to event stream' }), {
        status: backendRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(backendRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Stream connection error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
