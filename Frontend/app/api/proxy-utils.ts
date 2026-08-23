import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, verifySession, getSessionToken } from '@/lib/server-auth';
import { sanitizeBackendResponse } from '@/shared/infrastructure/http/api-client';

/**
 * Require a valid admin session token. Returns the token string or sends a 401 response.
 * Used by admin proxy and shared proxy helpers.
 */
export async function requireAdminToken(): Promise<string | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('betrix_admin_token')?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized: Admin session required' } },
      { status: 401 }
    );
  }
  const user = await verifySession(token);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized: Invalid or expired session' } },
      { status: 401 }
    );
  }
  return token;
}

interface ProxyOptions {
  /** Backend route prefix, e.g. "market" → /market/... */
  prefix: string;
  /** If true, use getSessionToken() (reads from cookie server-side). If false, read from request cookie directly. */
  useServerSession?: boolean;
}

/**
 * Shared proxy handler for simple GET-only routes (market, news).
 * Handles: auth check → build URL → fetch → sanitize response.
 */
export async function proxyGet(
  request: NextRequest,
  options: ProxyOptions & { pathSegments?: string[] }
): Promise<NextResponse> {
  try {
    const token = options.useServerSession
      ? await getSessionToken()
      : null; // caller reads from cookie if needed

    if (token === null) {
      // Fallback: read from cookie directly
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get('betrix_admin_token')?.value ?? null;
      if (!cookieToken) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized: Admin session required' } },
          { status: 401 }
        );
      }
      const user = await verifySession(cookieToken);
      if (!user) {
        return NextResponse.json(
          { success: false, error: { message: 'Unauthorized: Admin session required' } },
          { status: 401 }
        );
      }
      return forwardGet(request, options.prefix, cookieToken, options.pathSegments);
    }

    const user = await verifySession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Admin session required' } },
        { status: 401 }
      );
    }

    return forwardGet(request, options.prefix, token, options.pathSegments);
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Internal proxy error' } },
      { status: 500 }
    );
  }
}

async function forwardGet(
  request: NextRequest,
  prefix: string,
  token: string,
  pathSegments?: string[]
): Promise<NextResponse> {
  const subPath = pathSegments?.length ? `/${pathSegments.join('/')}` : '';
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/${prefix}${subPath}${searchParams ? `?${searchParams}` : ''}`;

  const backendRes = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  });

  const data = await backendRes.json();
  return NextResponse.json(sanitizeBackendResponse(data, backendRes.status), { status: backendRes.status });
}
