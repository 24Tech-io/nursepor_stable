import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch all students with their stats
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      if (!auth.isAuthenticated) logger.error('[GET /api/students] Not authenticated');
      if (auth.isAuthenticated) logger.error('[GET /api/students] Role check failed');
      return auth.response;
    }
    const { user: decoded } = auth;

    // Simple query - just return all users with student role
    const db = await getDatabaseWithRetry();
    const allStudents = await db
      .select()
      .from(users)
      .where(eq(users.role, 'student'))
      .orderBy(desc(users.createdAt))
      .limit(100);

    return NextResponse.json({
      students: allStudents,
      total: allStudents.length
    });
  } catch (error: any) {
    logger.error('Get students error:', error);
    return NextResponse.json({
      message: 'Failed to fetch students',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
