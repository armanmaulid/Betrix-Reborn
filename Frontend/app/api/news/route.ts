import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getSessionToken, verifySession } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const token = await getSessionToken();
    const user = await verifySession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Admin session required' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/news${searchParams ? `?${searchParams}` : ''}`;

    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch market news' } },
      { status: 500 }
    );
  }
}
