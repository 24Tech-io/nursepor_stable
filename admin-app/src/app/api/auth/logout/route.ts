import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 [/api/auth/logout] Logout requested');

    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the token cookie (matches what auth/login sets)
    response.cookies.set('token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Immediately expire the cookie
    });

    console.log('✅ [/api/auth/logout] Cookie cleared');

    return response;
  } catch (error: any) {
    console.error('❌ [/api/auth/logout] Error:', error);
    return NextResponse.json(
      { message: 'Failed to logout', error: error.message },
      { status: 500 }
    );
  }
}

