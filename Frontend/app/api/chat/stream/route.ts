import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server-auth';
import { requireAdminToken } from '@/app/api/proxy-utils';

const MAX_BODY_CHARS = 100_000;

/**
 * SSE passthrough proxy for the REAL chat stream (POST /chat/stream).
 *
 * The backend endpoint is a POST that holds an `text/event-stream` connection
 * open (emitting `context`/`think`/`delta`/`done`/`error` events) — it is NOT a
 * GET EventSource target. We forward the admin session token and the JSON body,
 * then pipe the raw stream back without buffering or the 30s REST timeout.
 */
export async function POST(request: NextRequest) {
  const tokenOrResponse = await requireAdminToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;
  const token = tokenOrResponse;

  let bodyData: string;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { success: false, error: { message: 'Payload too large' } },
        { status: 413 }
      );
    }
    bodyData = text;
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid request body' } },
      { status: 400 }
    );
  }

  try {
    // Long-lived stream: inherit only the client's own abort signal, never a
    // 30s timeout (which would sever the connection mid-chunk).
    const backendRes = await fetch(`${BACKEND_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: bodyData,
      redirect: 'error',
      signal: request.signal
    });

    const contentType = backendRes.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
      responseHeaders.set('X-Accel-Buffering', 'no');
      responseHeaders.set('Connection', 'keep-alive');
      return new NextResponse(backendRes.body, {
        status: backendRes.status,
        headers: responseHeaders
      });
    }

    // Non-stream response (e.g. 402 insufficient credits) — pass JSON through.
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Internal proxy error' } },
      { status: 500 }
    );
  }
}
