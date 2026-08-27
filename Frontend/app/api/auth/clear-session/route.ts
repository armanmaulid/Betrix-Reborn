import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Server-side session invalidation exit: deletes the httpOnly admin cookie and
 * redirects to /login. Used by the dashboard layout when a cookie is present
 * but the backend has revoked the session (e.g. after a password reset).
 *
 * A Server Component cannot modify cookies (`Cookies can only be modified in a
 * Server Action or Route Handler`), so the layout hands off here instead of
 * calling cookieStore.delete() inline. Without this, the stale cookie makes the
 * proxy.ts guard bounce /login straight back to /dashboard — an infinite loop.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('betrix_admin_token');
  // Preserve the `from` target so the login page can return the user to where
  // they were after re-auth (validated again on the login page itself).
  const from = _request.nextUrl.searchParams.get('from') || '/dashboard';
  const safeFrom =
    from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : '/dashboard';

  // Build the redirect origin from the browser-facing Host header, NOT
  // _request.url. Under `next start -H 0.0.0.0` (or behind a reverse proxy)
  // _request.url carries the bind/proxy host (0.0.0.0:3001), which would send
  // the browser to a dead/foreign host. X-Forwarded-Host (set by real proxies)
  // wins over Host; both are the origin the browser actually used.
  const host = _request.headers.get('x-forwarded-host') || _request.headers.get('host') || '';
  const proto = _request.headers.get('x-forwarded-proto') || 'http';
  const origin = host ? `${proto}://${host}` : _request.nextUrl.origin;

  // NextResponse.redirect() rejects relative URLs — must be absolute.
  const target = new URL(`/login?from=${encodeURIComponent(safeFrom)}`, origin);
  target.searchParams.set('reason', 'expired');
  return NextResponse.redirect(target);
}
