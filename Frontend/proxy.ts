import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Convention
 * Acts as the Edge Network Boundary for route interception and auth redirection.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('betrix_admin_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  // Only true framework-owned/static assets bypass the auth check. A blanket
  // "pathname contains a dot" exemption would let anonymous visitors reach
  // any dot-containing route (e.g. /dashboard.html) and leak the rich 404 page.
  const isStaticFile = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  if (isStaticFile || isApiAuthRoute) {
    return NextResponse.next();
  }

  // 1. If user is authenticated and attempts to visit /login or root /, redirect to /dashboard
  if (token && (isAuthPage || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If user is NOT authenticated:
  if (!token) {
    if (isAuthPage) {
      return NextResponse.next();
    }

    // API consumers must receive a machine-readable 401, not a 307 to the
    // HTML login page — fetch() follows redirects transparently and would
    // surface a confusing "unexpected token <" parse error instead.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { message: 'Session required' } },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && !pathname.startsWith('/login')) {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

export default proxy;
