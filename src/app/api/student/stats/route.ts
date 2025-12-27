import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, courses, accessRequests, qbankEnrollments, qbankTests } from '@/lib/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

// CACHE DISABLED - Force fresh data
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth.isAuthenticated || !auth.user) {
      return createAuthError('Not authenticated');
    }
    const decoded = auth.user;

    // Get database instance with retry
    const db = await getDatabaseWithRetry();

    const userId = decoded.id;
    logger.info(`📊 Fetching stats for user ID: ${userId}`);

    // Get pending request course IDs to exclude from enrolled count
    let pendingRequests: { courseId: number }[] = [];
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
      logger.warn('⚠️ access_requests table not accessible:', error?.message);
    }

    const pendingRequestCourseIds = pendingRequests.map(r => r.courseId);

    // Get enrolled courses from student_progress table (the ONLY course enrollment table)
    let enrolledCourses: { courseId: number; totalProgress: number }[] = [];
    try {
      enrolledCourses = await db
        .select({
          courseId: studentProgress.courseId,
          totalProgress: studentProgress.totalProgress,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, userId),
            getPublishedCourseFilter()
          )
        );
      logger.info(`📚 Found ${enrolledCourses.length} enrolled courses`);
    } catch (error: any) {
      logger.warn('⚠️ student_progress table error:', error?.message);
    }

    // Filter out courses with pending requests
    const actualEnrolledCourses = enrolledCourses.filter(
      c => !pendingRequestCourseIds.includes(c.courseId)
    );

    const coursesEnrolled = actualEnrolledCourses.length;
    logger.info(`📚 Courses enrolled (excluding pending): ${coursesEnrolled}`);

    // Count completed courses (progress >= 100)
    const completedCourses = actualEnrolledCourses.filter(c => c.totalProgress >= 100);
    const coursesCompleted = completedCourses.length;

    // Calculate total progress and estimated hours
    const totalProgress = actualEnrolledCourses.reduce((sum, c) => sum + c.totalProgress, 0);
    // Estimate: assume average course is 10 hours, multiply by progress percentage
    const estimatedHours = coursesEnrolled > 0
      ? Math.round((totalProgress / coursesEnrolled / 100) * 10 * 10) / 10
      : 0;

    // Get Q-Bank stats
    let qbankStats = { enrolled: 0, testsCompleted: 0 };
    try {
      // Count Q-Bank enrollments
      const qbankEnrollmentCount = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(qbankEnrollments)
        .where(eq(qbankEnrollments.studentId, userId));

      qbankStats.enrolled = Number(qbankEnrollmentCount[0]?.count || 0);
      logger.info(`📝 Q-Banks enrolled: ${qbankStats.enrolled}`);

      // Count completed tests
      const testCount = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(qbankTests)
        .where(
          and(
            eq(qbankTests.userId, userId),
            eq(qbankTests.status, 'completed')
          )
        );

      qbankStats.testsCompleted = Number(testCount[0]?.count || 0);
      logger.info(`✅ Tests completed: ${qbankStats.testsCompleted}`);
    } catch (error: any) {
      logger.warn('⚠️ Q-Bank stats error:', error?.message);
    }

    // Use Q-Bank tests as quizzes completed count
    const quizzesCompleted = qbankStats.testsCompleted;

    // Calculate login streak (placeholder - would need a login tracking table)
    const currentStreak = 0;

    // Calculate total points
    // Points = (courses completed * 100) + (quizzes completed * 10)
    const totalPoints = coursesCompleted * 100 + quizzesCompleted * 10;

    const stats = {
      coursesEnrolled,
      coursesCompleted,
      hoursLearned: estimatedHours,
      quizzesCompleted,
      currentStreak,
      totalPoints,
      // Additional stats for Q-Banks
      qbanksEnrolled: qbankStats.enrolled,
      testsCompleted: qbankStats.testsCompleted,
    };

    logger.info(`📊 Final stats:`, stats);

    return NextResponse.json({ stats });
  } catch (error: any) {
    logger.error('Get student stats error:', error);
    logger.error('Error details:', error?.message, error?.stack);
    return createErrorResponse(error, 'Failed to get student stats');
  }
}
