import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('betrix_admin_token')?.value;

    if (token) {
      try {
        // Synchronous server logout: tell backend to revoke the session in DB
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      } catch {
        // Ignore network errors during backend revocation, ensure local cookies are wiped
      }
    }

    // Delete cookies
    cookieStore.delete('betrix_admin_token');
    cookieStore.delete('betrix_admin_user');

    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully.' }
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Logout failed' } },
      { status: 500 }
    );
  }
}
