import { NextRequest, NextResponse } from 'next/server';
import { generateResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const resetToken = await generateResetToken(email);

    if (!resetToken) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json({
      message: 'Password reset instructions sent to your email',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
