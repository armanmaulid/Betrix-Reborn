import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server-auth';
import { requireAdminToken, sanitizePathSegments } from '@/app/api/proxy-utils';
import { sanitizeBackendResponse } from '@/shared/infrastructure/http/api-client';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
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
    let bodyData: any = undefined;

    if (!isGetOrHead) {
      try {
        const text = await request.text();
        if (text && text.trim().length > 0) {
          headers['Content-Type'] = 'application/json';
          bodyData = text;
        }
      } catch {}
    }

    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: bodyData
    });

    // If backend returns a stream (e.g. audit export CSV/JSON)
    const contentType = backendRes.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      const blob = await backendRes.blob();
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', contentType);
      const disposition = backendRes.headers.get('content-disposition');
      if (disposition) {
        responseHeaders.set('Content-Disposition', disposition);
      }
      return new NextResponse(blob, {
        status: backendRes.status,
        headers: responseHeaders
      });
    }

    const data = await backendRes.json();
    return NextResponse.json(sanitizeBackendResponse(data, backendRes.status), { status: backendRes.status });
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
export const PATCH = handleProxy;
export const DELETE = handleProxy;
