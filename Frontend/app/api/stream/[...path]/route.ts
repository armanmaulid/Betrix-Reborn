import { NextRequest } from 'next/server';
import { BACKEND_URL, getSessionToken, verifySession } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const token = await getSessionToken();
    const user = await verifySession(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin session required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { path } = await params;
    const subPath = path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/stream/${subPath}${searchParams ? `?${searchParams}` : ''}`;

    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${token}`
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
  } catch {
    return new Response(JSON.stringify({ error: 'Stream connection error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
