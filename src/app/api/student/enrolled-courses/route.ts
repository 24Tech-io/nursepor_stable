import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, courses, accessRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { startRouteMonitoring } from '@/lib/performance-monitor';

// CACHE DISABLED - Force fresh data
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const stopMonitoring = startRouteMonitoring('/api/student/enrolled-courses');
  try {
    const auth = await verifyAuth(request);

    if (!auth.isAuthenticated || !auth.user) {
      stopMonitoring();
      return createAuthError('Not authenticated');
    }
    const decoded = auth.user;

    // Get database instance with retry
    const db = await getDatabaseWithRetry();
    const userId = decoded.id;

    logger.info(`📚 Fetching enrolled courses for user ID: ${userId}`);

    // Get pending access requests to exclude
    let pendingRequestCourseIds: number[] = [];
    try {
      const pendingRequests = await db
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
      pendingRequestCourseIds = pendingRequests.map(r => r.courseId);
    } catch (error: any) {
      logger.warn('⚠️ Error fetching access requests:', error?.message);
    }

    // Get enrolled courses from student_progress table (the ONLY enrollment source)
    let enrolledCourses: any[] = [];
    try {
      enrolledCourses = await retryDatabase(async () => {
        return await db
          .select({
            courseId: studentProgress.courseId,
            totalProgress: studentProgress.totalProgress,
            lastAccessed: studentProgress.lastAccessed,
            course: {
              id: courses.id,
              title: courses.title,
              description: courses.description,
              instructor: courses.instructor,
              thumbnail: courses.thumbnail,
              pricing: courses.pricing,
              status: courses.status,
            },
          })
          .from(studentProgress)
          .innerJoin(courses, eq(studentProgress.courseId, courses.id))
          .where(
            and(
              eq(studentProgress.studentId, userId),
              getPublishedCourseFilter()
            )
          );
      });
      logger.info(`📚 Found ${enrolledCourses.length} enrolled courses from student_progress`);
    } catch (error: any) {
      logger.error('❌ Error fetching enrolled courses:', error?.message);
    }

    // Filter out courses with pending requests
    const filteredCourses = enrolledCourses.filter(
      (p: any) => !pendingRequestCourseIds.includes(p.courseId)
    );

    logger.info(`✅ Returning ${filteredCourses.length} enrolled courses (excluded ${enrolledCourses.length - filteredCourses.length} with pending requests)`);

    stopMonitoring();
    return NextResponse.json({
      enrolledCourses: filteredCourses.map((p: any) => ({
        courseId: p.courseId.toString(),
        progress: p.totalProgress || 0,
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed).toISOString() : null,
        course: p.course,
      })),
    });
  } catch (error: any) {
    stopMonitoring();
    logger.error('❌ Get enrolled courses error:', error);
    logger.error('Error details:', error?.message, error?.stack);
    return createErrorResponse(error, 'Failed to get enrolled courses');
  }
}
