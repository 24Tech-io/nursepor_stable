import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { createSession } from '@/lib/auth';
import { log } from '@/lib/logger-helper';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

import { extractAndValidate } from '@/lib/api-validation';
import { verify2FASchema } from '@/lib/validation-schemas-extended';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const bodyValidation = await extractAndValidate(request, verify2FASchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { tempToken, otp, email } = bodyValidation.data;

    // Verify temp token
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (tokenError) {
      return NextResponse.json({ message: 'Invalid or expired session. Please login again.' }, { status: 401 });
    }

    if (decoded.purpose !== '2fa') {
      return NextResponse.json({ message: 'Invalid token type' }, { status: 401 });
    }

    // Verify OTP
    const { verifyOTP } = await import('@/lib/otp');
    const isValidOTP = await verifyOTP(decoded.email, otp);

    if (!isValidOTP) {
      return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 401 });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'Account is deactivated' }, { status: 403 });
    }

    // Create session
    const sessionToken = await createSession(user.id, undefined, user);

    log.info('2FA verification successful', { userId: user.id });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
      redirectUrl: '/student/dashboard',
    });

    response.cookies.set('student_token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;

  } catch (error: any) {
    log.error('2FA verification error', error);
    return NextResponse.json({ message: 'Verification failed' }, { status: 500 });
  }
}





