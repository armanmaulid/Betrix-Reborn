import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifySession } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  const token = await getSessionToken();
  const user = await verifySession(token);

  if (!user) {
    return NextResponse.json({
      success: false,
      data: { authenticated: false }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      authenticated: true,
      user
    }
  });
}
