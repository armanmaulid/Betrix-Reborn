import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('betrix_admin_token')?.value;

    if (!token) {
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
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to acquire stream ticket.' } },
      { status: 500 }
    );
  }
}
