import { cookies } from 'next/headers';

function resolveBackendUrl(): string {
  const internal = process.env.BACKEND_INTERNAL_URL;
  if (internal) return internal;

  // In production, never fall back to the public URL — server-side fetches
  // must go through the internal network to avoid leaking traffic through
  // the public ingress and hitting rate-limits / geo-restrictions.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BACKEND_INTERNAL_URL must be set in production. ' +
        'Server-side fetches must not fall back to the public API URL.'
    );
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
}

export const BACKEND_URL = resolveBackendUrl();

/**
 * Read the httpOnly admin JWT from the request cookie.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('betrix_admin_token')?.value ?? null;
}

/**
 * Verify a session token against the backend and return the authenticated admin
 * user (or null when the token is missing, invalid, expired, or not an admin).
 * A backend network failure also resolves to null — treat null as "not authenticated".
 */
export async function verifySession(token: string | null): Promise<Record<string, unknown> | null> {
  if (!token) return null;

  // Playwright e2e injects a fake cookie that is never a real backend JWT
  // (both `mock-admin-token` and `mock-jwt-admin-token` appear in the suite).
  // Trust any `mock-` token only under the e2e harness so the suite does not
  // round-trip to the backend and redirect-loop. PLAYWRIGHT=true is injected
  // solely by playwright.config.ts's webServer env — never set in production.
  if (process.env.PLAYWRIGHT === 'true' && token.startsWith('mock-')) {
    return {
      id: 'adm-e2e',
      email: 'e2e-admin@betrix.ai',
      name: 'E2E Administrator',
      isAdmin: true,
      status: 'active'
    };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/me/profile`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.data?.isAdmin) return null;
    return data.data as Record<string, unknown>;
  } catch {
    return null;
  }
}
