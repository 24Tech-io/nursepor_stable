import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPassword, generateToken } from '@/lib/auth';

// Student login endpoint
// Admin login uses /api/auth/admin-login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
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
    const token = generateToken({
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

    response.cookies.set('studentToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAge,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed', error: error.message },
      { status: 500 }
    );
  }
}
