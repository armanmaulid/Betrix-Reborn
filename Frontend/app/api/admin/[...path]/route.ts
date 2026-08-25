import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server-auth';
import { requireAdminToken, sanitizePathSegments } from '@/app/api/proxy-utils';
import { sanitizeBackendResponse } from '@/shared/infrastructure/http/api-client';

const MAX_BODY_CHARS = 2_000_000;

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const tokenOrResponse = await requireAdminToken();
    if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;
    const token = tokenOrResponse;

    const safePath = sanitizePathSegments(path);
    if (safePath === null || safePath.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Bad request: invalid path' } },
        { status: 400 }
      );
    }
    const subPath = safePath.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/admin/${subPath}${searchParams ? `?${searchParams}` : ''}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    };

    const isGetOrHead = request.method === 'GET' || request.method === 'HEAD';
    let bodyData: string | undefined = undefined;

    if (!isGetOrHead) {
      try {
        const text = await request.text();
        if (text.length > MAX_BODY_CHARS) {
          return NextResponse.json(
            { success: false, error: { message: 'Payload too large' } },
            { status: 413 }
          );
        }
        if (text && text.trim().length > 0) {
          // Preserve the caller's Content-Type verbatim (e.g. multipart/form-data
          // boundaries must reach the backend untouched); only default to JSON
          // when the client did not specify one.
          const incomingContentType = request.headers.get('content-type');
          headers['Content-Type'] = incomingContentType || 'application/json';
          bodyData = text;
        }
      } catch {}
    }

    // Propagate the client's disconnect while capping total upstream time.
    // Node 22 supports AbortSignal.any; fall back to just request.signal otherwise.
    const upstreamSignal =
      typeof AbortSignal.any === 'function'
        ? AbortSignal.any([request.signal, AbortSignal.timeout(30000)])
        : request.signal;

    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: bodyData,
      redirect: 'error',
      signal: upstreamSignal
    });

    // If backend returns a stream (e.g. audit export CSV/JSON), pipe it through
    // without buffering the whole payload in memory.
    const upstreamContentType = backendRes.headers.get('content-type') || '';
    if (
      upstreamContentType.includes('text/csv') ||
      upstreamContentType.includes('application/octet-stream')
    ) {
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', upstreamContentType);
      const disposition = backendRes.headers.get('content-disposition');
      if (disposition) {
        responseHeaders.set('Content-Disposition', disposition);
      }
      return new NextResponse(backendRes.body, {
        status: backendRes.status,
        headers: responseHeaders
      });
    }

    const contentLength = backendRes.headers.get('content-length');
    const hasJsonBody =
      backendRes.status !== 204 && contentLength !== '0' && upstreamContentType.includes('json');

    if (!hasJsonBody) {
      // 204/205/304 forbid a response body per the fetch spec.
      if (backendRes.status === 204 || backendRes.status === 205 || backendRes.status === 304) {
        return new NextResponse(null, { status: backendRes.status });
      }
      return NextResponse.json({ success: true }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(sanitizeBackendResponse(data, backendRes.status), {
      status: backendRes.status
    });
  } catch {
    // Never leak internal/infra error details (hostnames, ports) to the client
    return NextResponse.json(
      { success: false, error: { message: 'Internal proxy error' } },
      { status: 500 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
