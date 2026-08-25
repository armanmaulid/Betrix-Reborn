import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, verifySession } from '@/lib/server-auth';
import { sanitizeBackendResponse } from '@/shared/infrastructure/http/api-client';

/**
 * Sanitize catch-all path segments before they are joined into an upstream URL.
 * Rejects empty segments, dot-segments ('.', '..'), encoded traversal leftovers,
 * and anything outside the conservative URL-safe whitelist so that a crafted
 * path can never escape the configured prefix boundary on the backend.
 *
 * Returns null when a segment fails validation (caller must respond 400).
 */
const SAFE_SEGMENT_RE = /^[A-Za-z0-9._~-]+$/;

export function sanitizePathSegments(segments: string[]): string[] | null {
  if (!segments || segments.length === 0) return [];
  const safe: string[] = [];
  for (const raw of segments) {
    let seg: string;
    try {
      // Catch-all params arrive decoded once; decode again to expose
      // double-encoded payloads like '%252e%252e'.
      seg = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!seg || seg === '.' || seg === '..') return null;
    if (!SAFE_SEGMENT_RE.test(seg)) return null;
    safe.push(seg);
  }
  return safe;
}

/**
 * Require a valid admin session token. Returns the token string or sends a 401 response.
 * Used by admin proxy and shared proxy helpers.
 */
export async function requireAdminToken(): Promise<string | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('betrix_admin_token')?.value;
  if (!token) {
    return unauthorized();
  }
  const user = await verifySession(token);
  if (!user) {
    return unauthorized();
  }
  return token;
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: { message: 'Unauthorized: Admin session required' } },
    { status: 401 }
  );
}

interface ProxyOptions {
  /** Backend route prefix, e.g. "market" → /market/... */
  prefix: string;
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
    const tokenOrResponse = await requireAdminToken();
    if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

    return await forwardGet(request, options.prefix, tokenOrResponse, options.pathSegments);
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
  const safeSegments = sanitizePathSegments(pathSegments ?? []);
  if (safeSegments === null) {
    return NextResponse.json(
      { success: false, error: { message: 'Bad request: invalid path' } },
      { status: 400 }
    );
  }
  const subPath = safeSegments.length ? `/${safeSegments.join('/')}` : '';
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/${prefix}${subPath}${searchParams ? `?${searchParams}` : ''}`;

  const backendRes = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(30000)
  });

  const data = await backendRes.json();
  return NextResponse.json(sanitizeBackendResponse(data, backendRes.status), {
    status: backendRes.status
  });
}
