import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, users, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    // Get database instance
    const db = getDatabase();

    const userId = decoded.id;

    // IMPORTANT: Get pending request course IDs to exclude from enrolled count
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(and(eq(accessRequests.studentId, userId), eq(accessRequests.status, 'pending')));

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Get all enrolled courses from BOTH tables
    const [allEnrolledProgress, allEnrolledRecords] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(and(eq(studentProgress.studentId, userId), getPublishedCourseFilter())),
      db
        .select({
          courseId: enrollments.courseId,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter()
          )
        ),
    ]);

    // Merge course IDs from both tables
    const allEnrolledCourseIds = new Set([
      ...allEnrolledProgress.map((p: any) => p.courseId),
      ...allEnrolledRecords.map((e: any) => e.courseId),
    ]);

    // Filter out courses with pending requests
    // A course with a pending request should NOT be counted as enrolled
    const actualEnrolledCourseIds = Array.from(allEnrolledCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    const coursesEnrolled = actualEnrolledCourseIds.length;

    // Get completed courses (progress >= 100) from BOTH tables - exclude courses with pending requests
    const [allCompletedProgress, allCompletedEnrollments] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
          totalProgress: studentProgress.totalProgress,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, userId),
            getPublishedCourseFilter(),
            sql`${studentProgress.totalProgress} >= 100`
          )
        ),
      db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter(),
            sql`${enrollments.progress} >= 100`
          )
        ),
    ]);

    // Merge completed course IDs from both tables
    const allCompletedCourseIds = new Set([
      ...allCompletedProgress.map((p: any) => p.courseId),
      ...allCompletedEnrollments.map((e: any) => e.courseId),
    ]);

    // Filter out courses with pending requests
    const actualCompletedCourseIds = Array.from(allCompletedCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    const coursesCompleted = actualCompletedCourseIds.length;

    // Calculate total hours learned (sum of progress from both tables)
    // Prefer enrollments.progress, fallback to studentProgress.totalProgress
    const [progressSum, enrollmentSum] = await Promise.all([
      db
        .select({
          totalProgress: sql<number>`coalesce(sum(${studentProgress.totalProgress}), 0)`,
        })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, userId)),
      db
        .select({
          totalProgress: sql<number>`coalesce(sum(${enrollments.progress}), 0)`,
        })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active'))),
    ]);

    // Use enrollments.progress as primary source, fallback to studentProgress
    const totalProgress = Number(
      enrollmentSum[0]?.totalProgress || progressSum[0]?.totalProgress || 0
    );

    // Estimate: assume average course is 10 hours, multiply by progress percentage
    // Average 10 hours per course, calculate based on progress
    const estimatedHours =
      coursesEnrolled > 0 ? Math.round((totalProgress / coursesEnrolled / 100) * 10 * 10) / 10 : 0;

    // Get quizzes completed count
    // For now, we'll estimate based on progress (assume 1 quiz per 20% progress)
    // In a real system, you'd have a quizAttempts table
    const quizzesCompleted =
      coursesEnrolled > 0 ? Math.floor(totalProgress / coursesEnrolled / 20) : 0;

    // Calculate login streak
    // Get user's last login dates and calculate consecutive days
    const user = await db
      .select({ lastLogin: users.lastLogin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let currentStreak = 0;
    if (user[0]?.lastLogin) {
      const lastLogin = new Date(user[0].lastLogin);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastLoginDate = new Date(lastLogin);
      lastLoginDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastLoginDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // If logged in today or yesterday, streak is at least 1
      if (diffDays <= 1) {
        currentStreak = 1; // Simplified - in real system, track daily logins
      }
    }

    // Calculate total points
    // Points = (courses completed * 100) + (quizzes completed * 10)
    // Streak does not contribute to points to avoid initial points confusion
    const totalPoints = coursesCompleted * 100 + quizzesCompleted * 10;

    return NextResponse.json({
      stats: {
        coursesEnrolled,
        coursesCompleted,
        hoursLearned: estimatedHours,
        quizzesCompleted,
        currentStreak,
        totalPoints,
      },
    });
  } catch (error: any) {
    console.error('Get student stats error:', error);
    return createErrorResponse(error, 'Failed to get student stats');
  }
}
