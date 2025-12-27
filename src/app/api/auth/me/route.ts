import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, validateSession } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { withCache, withAuthCache, CacheKeys, CacheTTL } from '@/lib/api-cache';
import { startRouteMonitoring, recordCacheHit, recordCacheMiss } from '@/lib/performance-monitor';

// Force dynamic rendering since this route uses request.url and cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const stopMonitoring = startRouteMonitoring('/api/auth/me');
  try {
    // Get type from query parameter (admin or student, defaults to student)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'student';

    // Get the appropriate token based on type
    const cookieName = type === 'admin' ? 'admin_token' : 'student_token';
    const token = request.cookies.get(cookieName)?.value;

    // Check for both admin and student tokens
    // Login sets: student_token (snake_case) and token
    const adminToken = request.cookies.get('admin_token')?.value;
    const studentToken = request.cookies.get('student_token')?.value;

    let selectedToken;

    // Strict Mode: If type is specified, ONLY check that specific token
    if (type === 'student') {
      selectedToken = studentToken || token; // Also check the generic 'student_token' 
    } else if (type === 'admin') {
      selectedToken = adminToken;
    } else {
      // Default / Legacy Mode: Check Admin first, then Student (fallback)
      selectedToken = adminToken || studentToken || token;
    }

    // Use specific token if found, otherwise fall back to generic cookie name check
    const finalToken = selectedToken || token;

    // During build time, this is expected to have no token (static page generation)
    if (!finalToken) {
      stopMonitoring();
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token (Try Session first, then JWT)
    let decoded = null;

    // 1. Try validating as a database session
    try {
      decoded = await validateSession(finalToken);
      if (decoded) {
        logger.info('✅ /api/auth/me - Valid session found');
      }
    } catch (sessionErr) {
      logger.error('Session validation error:', sessionErr);
    }

    // 2. Fallback to JWT verification if not a valid session
    if (!decoded) {
      try {
        decoded = await withAuthCache(
          finalToken,
          async () => verifyToken(finalToken),
          CacheTTL.AUTH_TOKEN
        );
        if (decoded) {
          logger.info('✅ /api/auth/me - Valid JWT found');
        }
      } catch (jwtErr) {
        logger.error('JWT verification error:', jwtErr);
      }
    }

    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token or session' }, { status: 401 });
    }

    // Get database instance (will throw if not available)
    let db;
    try {
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      logger.error('Database connection error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

    // Get user from database with caching (user data changes infrequently)
    const userId = decoded?.id || 0;
    const cacheKey = CacheKeys.AUTH_USER(userId);

    const user = await withCache(
      cacheKey,
      async () => {
        return await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            bio: users.bio,
            profilePicture: users.profilePicture,
            role: users.role,
            isActive: users.isActive,
            twoFactorEnabled: users.twoFactorEnabled,
            joinedDate: users.joinedDate,
            lastLogin: users.lastLogin,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
      },
      { ttl: CacheTTL.USER_DATA, dedupe: true }
    );

    if (!user || !user.length) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Log user data for debugging
    const phoneValue = user[0].phone;
    const phoneString = phoneValue && String(phoneValue).trim() ? String(phoneValue).trim() : null;

    logger.info('🔍 /api/auth/me - Token decoded ID:', decoded?.id);

    const userResponse = {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      phone: phoneString, // Convert to string and trim, or null if empty
      bio: user[0].bio && String(user[0].bio).trim() ? String(user[0].bio).trim() : null,
      profilePicture: user[0].profilePicture || null,
      role: user[0].role,
      isActive: user[0].isActive,
      twoFactorEnabled: user[0].twoFactorEnabled || false,
      joinedDate: user[0].joinedDate ? new Date(user[0].joinedDate).toISOString() : null,
      lastLogin: user[0].lastLogin ? new Date(user[0].lastLogin).toISOString() : null,
      faceIdEnrolled: false, // Default pending schema update
      fingerprintEnrolled: false, // Default pending schema update
      createdAt: user[0].joinedDate ? new Date(user[0].joinedDate).toISOString() : null,
    };

    logger.info('✅ /api/auth/me - Returning user data:', userResponse);

    stopMonitoring();
    return NextResponse.json({
      user: userResponse,
    });
  } catch (error: any) {
    stopMonitoring();
    logger.error('Get current user error:', error);
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    // Handle database connection errors
    if (error?.message?.includes('DATABASE_URL') ||
      error?.message?.includes('Database is not available') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    if (error?.message?.includes('does not exist') ||
      error?.code === '42P01') {
      return NextResponse.json(
        {
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Failed to get user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
