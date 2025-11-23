import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Auto-fix Data Inconsistencies
 * Cleans up orphaned records and fixes sync issues
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const fixes: any[] = [];
    let totalFixed = 0;

    // Get all valid IDs
    const allCourses = await db.select().from(courses);
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));

    const courseIds = new Set(allCourses.map(c => c.id));
    const studentIds = new Set(allStudents.map(s => s.id));

    // 1. Fix orphaned studentProgress entries
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
        count: orphanedProgress.length,
        description: 'Deleted orphaned student progress entries'
      });
      totalFixed += orphanedProgress.length;
    }

    // 2. Fix orphaned accessRequests
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
        count: orphanedRequests.length,
        description: 'Deleted orphaned access requests'
      });
      totalFixed += orphanedRequests.length;
    }

    // 3. Fix inconsistent enrollments (remove pending requests if studentProgress exists)
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
          
          totalFixed++;
        }
      }
    }

    if (totalFixed > 0) {
      fixes.push({
        type: 'inconsistent_enrollment',
        count: totalFixed - (orphanedProgress.length + orphanedRequests.length),
        description: 'Removed pending requests for already enrolled courses'
      });
    }

    // 4. Fix orphaned payments
    const allPayments = await db.select().from(payments);
    const orphanedPayments = allPayments.filter(p => 
      !courseIds.has(p.courseId) || !studentIds.has(p.userId)
    );

    if (orphanedPayments.length > 0) {
      const orphanedIds = orphanedPayments.map(p => p.id);
      await db
        .delete(payments)
        .where(inArray(payments.id, orphanedIds));
      
      fixes.push({
        type: 'orphaned_payments',
        count: orphanedPayments.length,
        description: 'Deleted orphaned payment records'
      });
      totalFixed += orphanedPayments.length;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fixes,
      totalFixed,
      message: `Fixed ${totalFixed} data inconsistency issue(s)`
    });
  } catch (error: any) {
    console.error('Sync fix error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fix sync issues',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


