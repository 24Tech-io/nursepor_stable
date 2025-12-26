import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql, count, gte } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    // Get active vs inactive students
    const studentStats = await db
      .select({
        isActive: users.isActive,
        count: count(),
      })
      .from(users)
      .where(eq(users.role, 'student'))
      .groupBy(users.isActive);

    const active = studentStats.find((s: any) => s.isActive)?.count || 0;
    const inactive = studentStats.find((s: any) => !s.isActive)?.count || 0;

    // Get recent login stats (students who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogins = await db
      .select({ count: count() })
      .from(users)
      .where(
        sql`${users.role} = 'student' AND ${users.lastLogin} >= ${thirtyDaysAgo}`
      );

    return NextResponse.json({
      students: {
        total: active + inactive,
        active,
        inactive,
        recentActiveCount: recentLogins[0]?.count || 0
      }
    });
  } catch (error: any) {
    log.error('Get student stats error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}
