import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/lib/server-auth';

// Deterministic per-request fingerprint derived from client metadata, so the
// backend's rate-limit buckets are not all collapsed into one static string.
async function fallbackFingerprint(request: NextRequest): Promise<string> {
  const ua = request.headers.get('user-agent') || 'unknown';
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const raw = `${ip}|${ua}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

    const fingerprint = deviceFingerprint || (await fallbackFingerprint(request));

    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        deviceFingerprint: fingerprint,
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

    const { token, user } = resData.data;

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
