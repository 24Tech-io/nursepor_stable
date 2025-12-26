import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { generateResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import {
  sanitizeString,
  validateEmail,
  getClientIP,
  rateLimit,
  validateBodySize,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent email enumeration
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`forgot-password:${clientIP}`, 3, 60 * 60 * 1000); // 3 requests per hour
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
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
    if (!validateBodySize(body, 256)) {
      return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    let { email } = data;

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Sanitize and validate email
    email = sanitizeString(email.toLowerCase(), 255);
    if (!validateEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    const resetToken = await generateResetToken(email);

    if (!resetToken) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Send reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
      return NextResponse.json({
        message: 'Password reset instructions sent to your email',
      });
    } catch (emailError: any) {
      // If SMTP is not configured, provide the reset link in the response for development
      if (emailError?.message?.includes('SMTP is not configured')) {
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;
        logger.info('📧 Password reset link (SMTP not configured):', resetUrl);
        return NextResponse.json({
          message: 'SMTP not configured. Password reset link generated. Check server console for the link.',
          resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
          note: 'For production, please configure SMTP settings in .env.local',
        }, { status: 200 });
      }
      throw emailError; // Re-throw if it's a different error
    }
  } catch (error: any) {
    logger.error('Forgot password error:', error);
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
