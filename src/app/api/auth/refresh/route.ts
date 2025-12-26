import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    logger.info('🔄 Token refresh request - Token exists:', !!token);

    if (!token) {
      logger.info('❌ Token refresh failed - No token provided');
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    // Try to verify the token
    let user: any = null;
    let shouldRefresh = false;

    try {
      const decoded = await verifyToken(token);
      if (decoded && decoded.id) {
        user = decoded;
        // Even if token is valid, we'll refresh it to ensure cookie is properly set
        shouldRefresh = true;
      }
    } catch (error) {
      // Token is invalid or expired, try to extract user ID from payload
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.id) {
          const db = await getDatabaseWithRetry();
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.id))
            .limit(1);
          
          if (userResult.length > 0 && userResult[0].isActive) {
            user = {
              id: userResult[0].id,
              name: userResult[0].name,
              email: userResult[0].email,
              phone: userResult[0].phone,
              bio: userResult[0].bio,
              role: userResult[0].role,
              isActive: userResult[0].isActive,
              fingerprintEnrolled: userResult[0].fingerprintEnrolled || false,
              twoFactorEnabled: userResult[0].twoFactorEnabled || false,
              joinedDate: userResult[0].joinedDate,
            };
            shouldRefresh = true;
          }
        }
      } catch (e) {
        // Can't extract user ID from token
        logger.error('Token refresh error - cannot extract user ID:', e);
      }
    }

    // If we have a user, check if they're accessing admin routes and have an admin account
    if (user && shouldRefresh) {
      // Check if this is an admin route request
      const isAdminRoute = request.nextUrl.pathname.startsWith('/api/admin') || 
                          request.headers.get('referer')?.includes('/admin');
      
      // If accessing admin routes and user is not admin, check for admin account
      if (isAdminRoute && user.role !== 'admin') {
        try {
          const { getUserAccounts } = await import('@/lib/auth');
          const accounts = await getUserAccounts(user.email);
          const adminAccount = accounts.find(acc => acc.role === 'admin' && acc.isActive);
          
          if (adminAccount) {
            logger.info('🔄 Token refresh - Switching to admin account for admin route access');
            user = {
              id: adminAccount.id,
              name: adminAccount.name,
              email: adminAccount.email,
              phone: adminAccount.phone || null,
              bio: adminAccount.bio || null,
              role: adminAccount.role,
              isActive: adminAccount.isActive,
              fingerprintEnrolled: adminAccount.fingerprintEnrolled || false,
              twoFactorEnabled: adminAccount.twoFactorEnabled || false,
              joinedDate: adminAccount.joinedDate || null,
            };
          }
        } catch (error) {
          logger.error('Error checking for admin account during refresh:', error);
        }
      }

      const newToken = generateToken(user);

      logger.info('✅ Token refresh successful - User:', user.email, 'Role:', user.role);

      const response = NextResponse.json({
        message: 'Token refreshed successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      // Always set the cookie to ensure it's properly configured
      response.cookies.set('token', newToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // CRITICAL: true in production
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      logger.info('🍪 Cookie set in refresh response');

      return response;
    }

    // No valid user found
    logger.info('❌ Token refresh failed - No valid user found');
    return NextResponse.json(
      { message: 'Invalid or expired token. Please log in again.' },
      { status: 401 }
    );
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

