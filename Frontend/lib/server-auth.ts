import { cookies } from 'next/headers';

export const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
  try {
    const res = await fetch(`${BACKEND_URL}/me/profile`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.data?.isAdmin) return null;
    return data.data as Record<string, unknown>;
  } catch {
    return null;
  }
}
