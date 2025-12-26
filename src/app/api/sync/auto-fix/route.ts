import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Automatic Sync Fix (Runs periodically)
 * Automatically fixes common sync issues without admin intervention
 */
export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by a cron job or scheduled task
    // For security, we can require an API key or make it admin-only
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;
    const apiKey = request.headers.get('x-api-key');

    // Allow either authenticated user or API key
    if (!token && apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDatabaseWithRetry();
    const fixes: any[] = [];
    let totalFixed = 0;

    // Get all valid IDs
    const allCourses = await db.select().from(courses);
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));

    const courseIds = new Set(allCourses.map(c => c.id));
    const studentIds = new Set(allStudents.map(s => s.id));

    // 1. Auto-fix orphaned studentProgress entries
    const allProgress = await db.select().from(studentProgress);
    const orphanedProgress = allProgress.filter(p => 
      !courseIds.has(p.courseId) || !studentIds.has(p.studentId)
    );

    if (orphanedProgress.length > 0) {
      const orphanedIds = orphanedProgress.map(p => p.id);
      await db
        .delete(studentProgress)
        .where(inArray(studentProgress.id, orphanedIds));
      
      fixes.push({
        type: 'orphaned_progress',
        count: orphanedProgress.length
      });
      totalFixed += orphanedProgress.length;
    }

    // 2. Auto-fix orphaned accessRequests
    const allRequests = await db.select().from(accessRequests);
    const orphanedRequests = allRequests.filter(r => 
      !courseIds.has(r.courseId) || !studentIds.has(r.studentId)
    );

    if (orphanedRequests.length > 0) {
      const orphanedIds = orphanedRequests.map(r => r.id);
      await db
        .delete(accessRequests)
        .where(inArray(accessRequests.id, orphanedIds));
      
      fixes.push({
        type: 'orphaned_requests',
        count: orphanedRequests.length
      });
      totalFixed += orphanedRequests.length;
    }

    // 3. Auto-fix inconsistent enrollments (remove pending requests if studentProgress exists)
    let inconsistentFixed = 0;
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
          await db
            .delete(accessRequests)
            .where(eq(accessRequests.id, pendingRequest[0].id));
          inconsistentFixed++;
        }
      }
    }

    if (inconsistentFixed > 0) {
      fixes.push({
        type: 'inconsistent_enrollment',
        count: inconsistentFixed
      });
      totalFixed += inconsistentFixed;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fixes,
      totalFixed,
      message: totalFixed > 0 
        ? `Auto-fixed ${totalFixed} sync issue(s)` 
        : 'No sync issues found'
    });
  } catch (error: any) {
    logger.error('Auto-fix error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to auto-fix sync issues',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}











