import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
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

    if (!token) {
      stopMonitoring();
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Cache token verification (5 min TTL)
    let decoded = await withAuthCache(
      token,
      async () => verifyToken(token),
      CacheTTL.AUTH_TOKEN
    );

    // If token is expired, try to extract user ID from payload
    if (!decoded || !decoded.id) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.id) {
          // Use the ID from the expired token to get user from database
          decoded = { id: payload.id } as any;
        } else {
          return NextResponse.json(
            { message: 'Invalid token' },
            { status: 401 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { message: 'Invalid token' },
          { status: 401 }
        );
      }
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

    if (!user.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Log user data for debugging
    const phoneValue = user[0].phone;
    const phoneString = phoneValue && String(phoneValue).trim() ? String(phoneValue).trim() : null;

    logger.info('🔍 /api/auth/me - Token decoded ID:', decoded?.id);
    logger.info('🔍 /api/auth/me - User found in database:', {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      phone: phoneValue,
      phoneType: typeof phoneValue,
      phoneIsNull: phoneValue === null,
      phoneIsUndefined: phoneValue === undefined,
      phoneIsEmptyString: phoneValue === '',
      phoneAfterProcessing: phoneString,
      role: user[0].role,
      bio: user[0].bio,
      profilePicture: user[0].profilePicture,
      joinedDate: user[0].joinedDate,
    });

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
