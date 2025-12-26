import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, courses, users, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';
import { logger } from '@/lib/logger';

// Cache for 30 seconds - allows stale-while-revalidate
export const revalidate = 30;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    // Get database instance with retry
    const db = await getDatabaseWithRetry();

    const userId = decoded.id;

    // IMPORTANT: Get pending request course IDs to exclude from enrolled count
    // Handle case where access_requests table might not exist
    let pendingRequests = [];
    try {
      pendingRequests = await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, userId),
              eq(accessRequests.status, 'pending')
          )
      );
    } catch (error: any) {
      // Table doesn't exist or query failed - continue with empty array
      logger.warn('⚠️ access_requests table not accessible, continuing without pending requests filter:', error?.message);
    }

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Get all enrolled courses from BOTH tables
    // Handle case where student_progress table might not exist
    let allEnrolledProgress = [];
    let allEnrolledRecords = [];
    
    try {
      [allEnrolledProgress, allEnrolledRecords] = await Promise.all([
        // Try student_progress table (may not exist)
        (async () => {
          try {
            return await db
              .select({
                courseId: studentProgress.courseId,
              })
              .from(studentProgress)
              .innerJoin(courses, eq(studentProgress.courseId, courses.id))
              .where(
                and(
                  eq(studentProgress.studentId, userId),
                  getPublishedCourseFilter()
              )
            );
          } catch (error: any) {
            logger.warn('⚠️ student_progress table not accessible:', error?.message);
            return [];
          }
        })(),
        // enrollments table should exist
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
    } catch (error: any) {
      logger.warn('⚠️ Error fetching enrolled courses:', error?.message);
      // Continue with empty arrays
    }

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
    let allCompletedProgress = [];
    let allCompletedEnrollments = [];
    
    try {
      [allCompletedProgress, allCompletedEnrollments] = await Promise.all([
        // Try student_progress table (may not exist)
        (async () => {
          try {
            return await db
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
            );
          } catch (error: any) {
            logger.warn('⚠️ student_progress table not accessible for completed courses:', error?.message);
            return [];
          }
        })(),
        // enrollments table should exist
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
    } catch (error: any) {
      logger.warn('⚠️ Error fetching completed courses:', error?.message);
      // Continue with empty arrays
    }

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
    let progressSum = [{ totalProgress: 0 }];
    let enrollmentSum = [{ totalProgress: 0 }];
    
    try {
      [progressSum, enrollmentSum] = await Promise.all([
        // Try student_progress table (may not exist)
        (async () => {
          try {
            return await db
              .select({
                totalProgress: sql<number>`coalesce(sum(${studentProgress.totalProgress}), 0)`,
              })
              .from(studentProgress)
              .where(eq(studentProgress.studentId, userId));
          } catch (error: any) {
            logger.warn('⚠️ student_progress table not accessible for progress sum:', error?.message);
            return [{ totalProgress: 0 }];
          }
        })(),
        // enrollments table should exist
        db
          .select({
            totalProgress: sql<number>`coalesce(sum(${enrollments.progress}), 0)`,
          })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, userId),
              eq(enrollments.status, 'active')
          )
      ),
      ]);
    } catch (error: any) {
      logger.warn('⚠️ Error calculating progress sum:', error?.message);
      // Continue with default values
    }

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
    // Note: lastLogin column doesn't exist in current DB schema
    // Simplified streak calculation - always return 0 for now
    // In a real system, you'd track daily logins in a separate table
    const currentStreak = 0;

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
    logger.error('Get student stats error:', error);
    logger.error('Error details:', error?.message, error?.stack);
    return createErrorResponse(error, 'Failed to get student stats');
  }
}
