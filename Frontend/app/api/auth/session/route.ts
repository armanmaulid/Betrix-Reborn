import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('betrix_admin_token')?.value;
    const userJson = cookieStore.get('betrix_admin_user')?.value;

    if (!token || !userJson) {
      return NextResponse.json({
        success: false,
        data: { authenticated: false }
      });
    }

    const user = JSON.parse(userJson);

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        user
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Failed to read session' }
      },
      { status: 500 }
    );
  }
}
