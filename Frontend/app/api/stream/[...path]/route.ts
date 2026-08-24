import { NextRequest } from 'next/server';
import { BACKEND_URL, getSessionToken, verifySession } from '@/lib/server-auth';
import { sanitizePathSegments } from '@/app/api/proxy-utils';

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
    const safePath = sanitizePathSegments(path);
    if (safePath === null || safePath.length === 0) {
      return new Response(JSON.stringify({ error: 'Bad request: invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const subPath = safePath.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/stream/${subPath}${searchParams ? `?${searchParams}` : ''}`;

    // Propagate the client's abort signal so a browser disconnect or
    // EventSource reconnect tears down the upstream connection as well.
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${token}`
      },
      signal: request.signal,
      cache: 'no-store'
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
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Client disconnected; upstream fetch was aborted with it.
      return new Response(null, { status: 499 });
    }
    return new Response(JSON.stringify({ error: 'Stream connection error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
