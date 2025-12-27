import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, notifications } from '@/lib/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Real-time Sync Connection Endpoint for Admin App
 * Maintains a persistent connection for real-time synchronization
 * Uses polling mechanism for admin dashboard updates
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value || request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const userId = decoded.id;

    // Safely run a count query; if table is missing (42P01) or other errors occur,
    // log and return 0 instead of crashing the endpoint.
    const safeCount = async (label: string, fn: () => Promise<{ count: number }[]>) => {
      try {
        const [row] = await fn();
        return Number(row?.count || 0);
      } catch (err: any) {
        logger.warn(`[sync] ${label} count failed, returning 0`, err?.cause || err);
        return 0;
      }
    };

    // Get comprehensive sync data
    const syncData: any = {
      timestamp: new Date().toISOString(),
      userId,
      role: decoded.role,
    };

    if (decoded.role === 'admin') {
      // Admin sync data - optimized with parallel queries
      const [coursesCount, studentsCount, pendingRequestsCount] = await Promise.all([
        safeCount('courses', () =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(courses)
            .where(
              or(
                eq(courses.status, 'published'),
                eq(courses.status, 'active')
              )
            )
        ),
        safeCount('students', () =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, 'student'))
        ),
        safeCount('access_requests', () =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(accessRequests)
            .where(eq(accessRequests.status, 'pending'))
        ),
      ]);

      syncData.admin = {
        publishedCourses: coursesCount,
        totalStudents: studentsCount,
        pendingRequests: pendingRequestsCount,
      };
    } else {
      // Student sync data - exclude courses with pending requests
      const pendingRequests = await db
        .select({ courseId: accessRequests.courseId })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, userId),
            eq(accessRequests.status, 'pending')
          )
        );

      const pendingRequestCourseIds = new Set(pendingRequests.map((r: any) => r.courseId));

      const allEnrolledProgress = await db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, userId),
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active')
            )
          )
        );

      // Filter out courses with pending requests
      const actualEnrolled = allEnrolledProgress.filter((p: any) =>
        !pendingRequestCourseIds.has(p.courseId)
      );

      const enrolledCount = actualEnrolled.length;

      const unreadNotificationsCount = await safeCount('notifications', () =>
        db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.isRead, false)
            )
          )
      );

      const pendingRequestsCount = await safeCount('access_requests', () =>
        db
          .select({ count: sql<number>`count(*)` })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, userId),
              eq(accessRequests.status, 'pending')
            )
          )
      );

      syncData.student = {
        enrolledCourses: enrolledCount,
        unreadNotifications: unreadNotificationsCount,
        pendingRequests: pendingRequestsCount,
      };
    }

    return NextResponse.json({
      success: true,
      sync: syncData,
      message: 'Sync connection established',
    });
  } catch (error: any) {
    logger.error('Sync connection error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to establish sync connection',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

