import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

/**
 * Sync Health Check
 * Quick check of sync status and data consistency
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const db = getDatabase();

    // Quick health checks
    const health: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    // Check 1: Database connectivity
    try {
      await db.select().from(courses).limit(1);
      health.checks.database = { status: 'ok', message: 'Database connection healthy' };
    } catch (error) {
      health.checks.database = { status: 'error', message: 'Database connection failed' };
      health.status = 'unhealthy';
    }

    // Check 2: Course count consistency
    const [courseCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses);
    
    const [publishedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(or(eq(courses.status, 'published'), eq(courses.status, 'active')));

    health.checks.courses = {
      status: 'ok',
      total: Number(courseCount?.count || 0),
      published: Number(publishedCount?.count || 0)
    };

    // Check 3: Student count
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'student'));

    health.checks.students = {
      status: 'ok',
      total: Number(studentCount?.count || 0)
    };

    // Check 4: Enrollment consistency
    const allProgress = await db.select().from(studentProgress);
    const allCourses = await db.select().from(courses);
    const courseIds = new Set(allCourses.map(c => c.id));
    
    const orphanedProgress = allProgress.filter(p => !courseIds.has(p.courseId));
    
    health.checks.enrollments = {
      status: orphanedProgress.length === 0 ? 'ok' : 'warning',
      total: allProgress.length,
      orphaned: orphanedProgress.length,
      message: orphanedProgress.length === 0 
        ? 'All enrollments are valid' 
        : `${orphanedProgress.length} orphaned enrollment(s) found`
    };

    if (orphanedProgress.length > 0) {
      health.status = 'warning';
    }

    // Check 5: Pending requests
    const [pendingRequestsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'));

    health.checks.requests = {
      status: 'ok',
      pending: Number(pendingRequestsCount?.count || 0)
    };

    // Check 6: Request-enrollment consistency
    const inconsistentCount = await Promise.all(
      allProgress.map(async (p) => {
        if (!courseIds.has(p.courseId)) return null;
        
        const request = await db
          .select()
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, p.studentId),
              eq(accessRequests.courseId, p.courseId),
              eq(accessRequests.status, 'pending')
            )
          )
          .limit(1);
        
        return request.length > 0 ? 1 : 0;
      })
    );

    const inconsistent = inconsistentCount.reduce((sum, val) => sum + (val || 0), 0);
    
    health.checks.consistency = {
      status: inconsistent === 0 ? 'ok' : 'warning',
      inconsistent,
      message: inconsistent === 0 
        ? 'No inconsistent enrollments found' 
        : `${inconsistent} course(s) with both enrollment and pending request`
    };

    if (inconsistent > 0) {
      health.status = 'warning';
    }

    return NextResponse.json({
      success: true,
      health,
      message: health.status === 'healthy' 
        ? 'All systems synced and healthy' 
        : 'Some sync issues detected'
    });
  } catch (error: any) {
    console.error('Sync health check error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to check sync health',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}







