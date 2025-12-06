import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPassword, generateToken } from '@/lib/auth';

// Student login endpoint
// Admin login uses /api/auth/admin-login
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables - let getJWTSecret() handle JWT_SECRET validation
    // This avoids duplicate validation and ensures consistency
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is missing');
      return NextResponse.json(
        {
          message: 'Server configuration error. DATABASE_URL is missing.',
          error: process.env.NODE_ENV === 'development' ? 'DATABASE_URL must be set in environment variables' : undefined
        },
        { status: 500 }
      );
    }

    // JWT_SECRET validation is handled by generateToken() via getJWTSecret()
    // No need to duplicate validation here

    const body = await request.json();
    const { email, password, role, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check environment variables configuration
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasJwtSecret = !!process.env.JWT_SECRET;

    // Log configuration status in production for debugging deployment issues
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 Login attempt config check:', {
        hasDbUrl,
        hasJwtSecret,
        nodeEnv: process.env.NODE_ENV,
      });

      if (!hasDbUrl || !hasJwtSecret) {
        console.error('❌ CRITICAL: Missing environment variables in production!', {
          missingDb: !hasDbUrl,
          missingJwt: !hasJwtSecret
        });
      }
    }

    // Log environment check for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Student login attempt:', {
        email: email.toLowerCase(),
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      });
    }

    // If admin is trying to use this endpoint, redirect them
    if (role === 'admin') {
      return NextResponse.json(
        {
          message: 'Admin login is at /api/auth/admin-login',
          redirectTo: '/admin/login'
        },
        { status: 400 }
      );
    }

    let db;
    try {
      // Use retry logic for better stability
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection error. Please check your DATABASE_URL configuration.',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Find user by email and role (student)
    let userResult;
    try {
      userResult = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email.toLowerCase()), eq(users.role, role || 'student')))
        .limit(1);
    } catch (queryError: any) {
      console.error('❌ Database query failed:', queryError);
      return NextResponse.json(
        {
          message: 'Database query failed. Please try again.',
          error: process.env.NODE_ENV === 'development' ? queryError.message : undefined
        },
        { status: 500 }
      );
    }

    if (userResult.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate token
    let token;
    try {
      token = generateToken({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        bio: user.bio || null,
        role: user.role,
        isActive: user.isActive,
        faceIdEnrolled: user.faceIdEnrolled || false,
        fingerprintEnrolled: user.fingerprintEnrolled || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        joinedDate: user.joinedDate || null,
      });
    } catch (tokenError: any) {
      console.error('❌ Token generation failed:', tokenError);
      return NextResponse.json(
        {
          message: 'Authentication error. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
        },
        { status: 500 }
      );
    }

    // Set cookie with appropriate expiry based on rememberMe
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days vs 7 days

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

    // Set cookie with proper configuration for production
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('studentToken', token, {
      httpOnly: true,
      secure: isProduction, // Require HTTPS in production
      sameSite: isProduction ? 'lax' : 'lax', // 'lax' works for both same-site and cross-site top-level navigations
      maxAge: maxAge,
      path: '/',
      // Don't set domain - let browser use default (works for subdomains)
    });

    // Log cookie setting in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🍪 Student token cookie set:', {
        secure: isProduction,
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    // Enhanced error logging for debugging
    console.error('❌ Student login error:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDbUrl: !!process.env.DATABASE_URL,
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
    });

    // Handle specific error types
    if (error?.message?.includes('JWT_SECRET') || error?.message?.includes('jwt')) {
      return NextResponse.json(
        {
          message: 'Server configuration error. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    if (error?.message?.includes('DATABASE_URL') || error?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          message: 'Database connection error. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message: 'Login failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
