import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, notifications } from '@/lib/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';

/**
 * Real-time Sync Connection Endpoint
 * Maintains a persistent connection for real-time synchronization
 * Uses Server-Sent Events (SSE) or polling mechanism
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
    const userId = decoded.id;
    const isAdmin = decoded.role === 'admin';

    // Get comprehensive sync data
    const syncData: any = {
      timestamp: new Date().toISOString(),
      userId,
      role: decoded.role,
    };

    if (isAdmin) {
      // Admin sync data - optimized with parallel queries
      const [coursesCount, studentsCount, pendingRequestsCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(courses)
          .where(
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active'),
              eq(courses.status, 'Published'),
              eq(courses.status, 'Active')
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.role, 'student')),
        db
          .select({ count: sql<number>`count(*)` })
          .from(accessRequests)
          .where(eq(accessRequests.status, 'pending')),
      ]);

      syncData.admin = {
        publishedCourses: Number(coursesCount[0]?.count || 0),
        totalStudents: Number(studentsCount[0]?.count || 0),
        pendingRequests: Number(pendingRequestsCount[0]?.count || 0),
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
              eq(courses.status, 'active'),
              eq(courses.status, 'Published'),
              eq(courses.status, 'Active')
            )
          )
        );

      // Filter out courses with pending requests
      const actualEnrolled = allEnrolledProgress.filter((p: any) => 
        !pendingRequestCourseIds.has(p.courseId)
      );

      const enrolledCount = actualEnrolled.length;

      const [unreadNotificationsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      const [pendingRequestsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, userId),
            eq(accessRequests.status, 'pending')
          )
        );

      syncData.student = {
        enrolledCourses: Number(enrolledCount?.count || 0),
        unreadNotifications: Number(unreadNotificationsCount?.count || 0),
        pendingRequests: Number(pendingRequestsCount?.count || 0),
      };
    }

    return NextResponse.json({
      success: true,
      sync: syncData,
      message: 'Sync connection established',
    });
  } catch (error: any) {
    console.error('Sync connection error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to establish sync connection',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

