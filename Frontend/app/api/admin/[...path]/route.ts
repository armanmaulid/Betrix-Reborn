import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('betrix_admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Admin session required' } },
        { status: 401 }
      );
    }

    const subPath = path.join('/');
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
    return NextResponse.json(data, { status: backendRes.status });
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
