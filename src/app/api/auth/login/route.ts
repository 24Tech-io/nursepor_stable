import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Create session
    const sessionToken = await createSession(user.id);

    const response = NextResponse.json({
      message: 'Login successful',
      user,
    });

    // Set HttpOnly cookie for token
    response.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
