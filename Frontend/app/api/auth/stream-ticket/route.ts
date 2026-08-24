import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifySession, BACKEND_URL } from '@/lib/server-auth';
import { sanitizeBackendResponse } from '@/shared/infrastructure/http/api-client';

export async function POST(request: NextRequest) {
  try {
    const token = await getSessionToken();
    const user = await verifySession(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required for SSE stream.' } },
        { status: 401 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/stream-ticket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await backendRes.json();
    return NextResponse.json(sanitizeBackendResponse(data, backendRes.status), { status: backendRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to acquire stream ticket.' } },
      { status: 500 }
    );
  }
}
