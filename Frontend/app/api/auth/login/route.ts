import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, deviceFingerprint, captchaId, captchaAnswer } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and password are required.' } },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        deviceFingerprint: deviceFingerprint || 'betrix-admin-terminal-web',
        ...(captchaId ? { captchaId, captchaAnswer } : {})
      })
    });

    const resData = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: resData.error || { message: resData.message || 'Authentication failed' }
        },
        { status: backendRes.status }
      );
    }

    const { token, user, sessionToken } = resData.data;

    // Strict Security Guard: User MUST be an administrator
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Access Denied: You do not have administrator privileges.' }
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const isSecure = process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && isHttps);

    // 1. httpOnly Secure JWT Token Cookie
    cookieStore.set('betrix_admin_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // 2. Client-Readable User Metadata Cookie for fast UI hydration
    cookieStore.set(
      'betrix_admin_user',
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        status: user.status
      }),
      {
        httpOnly: false,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      }
    );

    // Token lives exclusively in the httpOnly cookie — never echoed in the body (XSS-safe)
    return NextResponse.json({
      success: true,
      data: { user }
    });
  } catch {
    // Never leak internal/infra error details to the client
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Internal server error during login' }
      },
      { status: 500 }
    );
  }
}
