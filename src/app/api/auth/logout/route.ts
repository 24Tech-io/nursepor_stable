import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 [/api/auth/logout] Logout requested');

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear BOTH admin and student token cookies
    response.cookies.set('adminToken', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Immediately expire the cookie
    });

    response.cookies.set('studentToken', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Immediately expire the cookie
    });

    console.log('✅ [/api/auth/logout] Both adminToken and studentToken cookies cleared');

    return response;
  } catch (error: any) {
    console.error('❌ [/api/auth/logout] Error:', error);
    return NextResponse.json(
      { message: 'Failed to logout', error: error.message },
      { status: 500 }
    );
  }
}
