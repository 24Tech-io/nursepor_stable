import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json(
        { message: 'Email, token, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const success = await resetPassword(email, token, password);

    if (!success) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Password reset successful',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
