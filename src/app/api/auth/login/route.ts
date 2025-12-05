import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
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

    const db = getDatabase();

    // Find user by email and role (student)
    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.role, role || 'student')))
      .limit(1);

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
