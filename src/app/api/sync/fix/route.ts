import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Auto-fix Data Inconsistencies (Admin App)
 */
export async function POST(request: NextRequest) {
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
    const fixes: any[] = [];
    let totalFixed = 0;

    const allCourses = await db.select().from(courses);
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));

    const courseIds = new Set(allCourses.map((c) => c.id));
    const studentIds = new Set(allStudents.map((s) => s.id));

    // Fix orphaned progress
    const allProgress = await db.select().from(studentProgress);
    const orphanedProgress = allProgress.filter(
      (p) => !courseIds.has(p.courseId) || !studentIds.has(p.studentId)
    );

    if (orphanedProgress.length > 0) {
      const orphanedIds = orphanedProgress.map((p) => p.id);
      await db.delete(studentProgress).where(inArray(studentProgress.id, orphanedIds));

      fixes.push({
        type: 'orphaned_progress',
        count: orphanedProgress.length,
      });
      totalFixed += orphanedProgress.length;
    }

    // Fix orphaned requests
    const allRequests = await db.select().from(accessRequests);
    const orphanedRequests = allRequests.filter(
      (r) => !courseIds.has(r.courseId) || !studentIds.has(r.studentId)
    );

    if (orphanedRequests.length > 0) {
      const orphanedIds = orphanedRequests.map((r) => r.id);
      await db.delete(accessRequests).where(inArray(accessRequests.id, orphanedIds));

      fixes.push({
        type: 'orphaned_requests',
        count: orphanedRequests.length,
      });
      totalFixed += orphanedRequests.length;
    }

    // Fix inconsistent enrollments
    for (const progress of allProgress) {
      if (courseIds.has(progress.courseId) && studentIds.has(progress.studentId)) {
        const pendingRequest = await db
          .select()
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, progress.studentId),
              eq(accessRequests.courseId, progress.courseId),
              eq(accessRequests.status, 'pending')
            )
          )
          .limit(1);

        if (pendingRequest.length > 0) {
          await db.delete(accessRequests).where(eq(accessRequests.id, pendingRequest[0].id));
          totalFixed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fixes,
      totalFixed,
      message: `Fixed ${totalFixed} data inconsistency issue(s)`,
    });
  } catch (error: any) {
    logger.error('Sync fix error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fix sync issues',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




