import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth';
import {
  sanitizeString,
  validateEmail,
  validatePassword,
  getClientIP,
  rateLimit,
  validateBodySize,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`reset-password:${clientIP}`, 3, 60 * 60 * 1000); // 3 attempts per hour
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many reset attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate request body size
    const body = await request.text();
    if (!validateBodySize(body, 512)) {
      return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { email, token, password } = data;

    if (!email || !token || !password) {
      return NextResponse.json(
        { message: 'Email, token, and password are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate
    const sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
    const sanitizedToken = sanitizeString(token, 64);

    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ message: passwordValidation.error }, { status: 400 });
    }

    const success = await resetPassword(sanitizedEmail, sanitizedToken, password);

    if (!success) {
      return NextResponse.json({ message: 'Invalid or expired reset token' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Password reset successful',
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    // Handle database connection errors
    if (
      error?.message?.includes('DATABASE_URL') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED'
    ) {
      return NextResponse.json(
        {
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json(
        {
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
