import { cookies } from 'next/headers';

function resolveBackendUrl(): string {
  const internal = process.env.BACKEND_INTERNAL_URL;
  if (internal) return internal;

  // Prefer the internal network URL in every environment, but never hard-crash
  // the server when it is absent (e.g. local `next start` smoke tests). Fall
  // back to the public API URL with a loud warning instead of throwing at
  // module scope — a thrown module initializer breaks ALL route handlers that
  // import it and manifests as an unrecoverable "stuck on login" loop.
  const fallback = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  console.warn(
    '[server-auth] BACKEND_INTERNAL_URL is not set — falling back to ' +
      `${fallback}. Server-side fetches will traverse the public ingress; ` +
      'set BACKEND_INTERNAL_URL for production deployments.'
  );
  return fallback;
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
 * Short-lived negative/positive cache of session verifications, keyed by a
 * hash of the token (never the raw token). Collapses the per-request backend
 * round-trip when several route handlers / the dashboard layout verify the
 * same token within a few seconds. Entries expire after 30s so bans and
 * revocations still take effect promptly.
 */
const VERIFY_TTL_MS = 30_000;
const verifyCache = new Map<string, { value: Record<string, unknown> | null; expiresAt: number }>();

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function pruneVerifyCache(): void {
  const now = Date.now();
  for (const [key, entry] of verifyCache) {
    if (entry.expiresAt <= now) verifyCache.delete(key);
  }
}

/**
 * Verify a session token against the backend and return the authenticated admin
 * user (or null when the token is missing, invalid, expired, or not an admin).
 * A backend network failure also resolves to null — treat null as "not authenticated".
 */
export async function verifySession(token: string | null): Promise<Record<string, unknown> | null> {
  if (!token) return null;

  // Playwright e2e harness: trust ONLY the exact `mock-<secret>` token whose
  // secret is regenerated per run by playwright.config.ts and injected into
  // this server's env. A static `PLAYWRIGHT=true` env leak alone therefore
  // grants nothing, and hardcoded mock tokens never authenticate anywhere.
  const e2eSecret = process.env.E2E_MOCK_SECRET;
  if (
    process.env.PLAYWRIGHT === 'true' &&
    e2eSecret &&
    e2eSecret.length >= 16 &&
    token === `mock-${e2eSecret}`
  ) {
    return {
      id: 'adm-e2e',
      email: 'e2e-admin@betrix.ai',
      name: 'E2E Administrator',
      isAdmin: true,
      status: 'active'
    };
  }

  const cacheKey = await hashToken(token);
  const cached = verifyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await fetchSessionProfile(token);
  pruneVerifyCache();
  verifyCache.set(cacheKey, { value, expiresAt: Date.now() + VERIFY_TTL_MS });
  return value;
}

async function fetchSessionProfile(token: string): Promise<Record<string, unknown> | null> {
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
