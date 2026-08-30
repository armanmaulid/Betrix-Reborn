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
  let body: {
    email?: string;
    password?: string;
    deviceFingerprint?: string;
    captchaId?: string;
    captchaAnswer?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid request body' } },
      { status: 400 }
    );
  }

  try {
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
        Accept: 'application/json',
        // Forward client metadata so the backend can derive its server-side
        // device fingerprint from the REAL client (requires TRUST_PROXY=true
        // on the backend when running behind this BFF).
        'User-Agent': request.headers.get('user-agent') || 'unknown',
        'X-Forwarded-For':
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          request.headers.get('x-real-ip') ||
          ''
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
      // Whitelist only known-safe fields from the upstream error — never
      // spread the raw object (it may leak internals like stack/infra data).
      const upstream = resData?.error;
      const safeError: {
        message: string;
        captchaId?: string;
        question?: string;
        delayMs?: number;
      } = {
        message:
          (typeof upstream?.message === 'string' && upstream.message) ||
          (typeof resData?.message === 'string' && resData.message) ||
          'Authentication failed'
      };
      // The CAPTCHA challenge lives under error.details.captcha (see backend
      // PreconditionRequiredError payload), not as a top-level captchaId.
      const captcha = upstream?.details?.captcha;
      if (typeof captcha?.id === 'string') safeError.captchaId = captcha.id;
      if (typeof captcha?.question === 'string') safeError.question = captcha.question;
      if (upstream?.delayMs) safeError.delayMs = upstream.delayMs;

      return NextResponse.json(
        {
          success: false,
          error: safeError
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

    const isHttps =
      request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    // `Secure` must follow the ACTUAL transport protocol, not NODE_ENV: a
    // production build served over plain HTTP (LAN smoke tests, docker on a
    // home server) would otherwise set a cookie the browser silently drops,
    // leaving users stuck on the login screen. COOKIE_SECURE=true forces it
    // on for deployments terminating TLS upstream of an odd proxy setup.
    const isSecure = isHttps || process.env.COOKIE_SECURE === 'true';

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
