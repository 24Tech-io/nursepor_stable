import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, courses, accessRequests, enrollments, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { mergeEnrollmentData } from '@/lib/progress-utils';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { withCache, CacheKeys, CacheTTL } from '@/lib/api-cache';
import { startRouteMonitoring, trackQuery } from '@/lib/performance-monitor';
import { getUserAccessRequests, getUserEnrollments } from '@/lib/optimized-queries';

export async function GET(request: NextRequest) {
  const stopMonitoring = startRouteMonitoring('/api/student/enrolled-courses');
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      stopMonitoring();
      return createAuthError('Not authenticated');
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      stopMonitoring();
      return createAuthError('Invalid token');
    }

    // Get database instance with retry
    const db = await getDatabaseWithRetry();

    // Cache access requests lookup
    const requestsCacheKey = `cache:student:access-requests:${decoded.id}`;
    const accessRequestsData = await withCache(
      requestsCacheKey,
      async () => {
        try {
          return await getUserAccessRequests(decoded.id);
        } catch (error: any) {
          logger.warn('⚠️ Error fetching access requests:', error?.message);
          return [];
        }
      },
      { ttl: CacheTTL.USER_DATA, dedupe: true }
    );

    const pendingRequestCourseIds = accessRequestsData
      .filter((r: any) => r.status === 'pending')
      .map((r: any) => r.courseId);
    const approvedRequestCourseIds = accessRequestsData
      .filter((r: any) => r.status === 'approved')
      .map((r: any) => r.courseId);
    
    logger.info(`🔍 Student ${decoded.id}: Found ${pendingRequestCourseIds.length} pending requests and ${approvedRequestCourseIds.length} approved requests`);
    
    // For approved requests, ensure enrollment exists (sync)
    // CRITICAL: Only sync approved requests - don't treat them as enrolled until enrollment records exist
    if (approvedRequestCourseIds.length > 0) {
      const { syncEnrollmentAfterApproval } = await import('@/lib/enrollment-sync');
      for (const courseId of approvedRequestCourseIds) {
        try {
          // Check if already enrolled in either table
          const [existingProgress, existingEnrollment] = await Promise.all([
            retryDatabase(async () => {
              try {
                return await db
                  .select({ id: studentProgress.id })
                  .from(studentProgress)
                  .where(
                    and(
                      eq(studentProgress.studentId, decoded.id),
                      eq(studentProgress.courseId, courseId)
                    )
                  )
                  .limit(1);
              } catch (error: any) {
                logger.warn('⚠️ student_progress table not accessible for enrollment check:', error?.message);
                return [];
              }
            }),
            retryDatabase(async () => {
              return await db
                .select({ id: enrollments.id })
                .from(enrollments)
                .where(
                  and(
                    eq(enrollments.userId, decoded.id),
                    eq(enrollments.courseId, courseId),
                    eq(enrollments.status, 'active')
                  )
                )
                .limit(1);
            }),
          ]);
          
          // Only sync if no enrollment exists in either table
          if (existingProgress.length === 0 && existingEnrollment.length === 0) {
            // Not enrolled yet - sync it
            logger.info(`🔄 Syncing enrollment for approved request: student ${decoded.id}, course ${courseId}`);
            await syncEnrollmentAfterApproval(decoded.id, courseId);
          }
        } catch (syncError: any) {
          logger.error(`❌ Error syncing enrollment for course ${courseId}:`, syncError);
          // Continue with other courses - don't fail the entire request
        }
      }
    }

    // Get enrolled courses from BOTH tables
    // IMPORTANT: Exclude courses that have pending requests
    // Handle case where student_progress table might not exist
    let allProgress = [];
    let allEnrollments = [];
    
    try {
      [allProgress, allEnrollments] = await Promise.all([
        retryDatabase(async () => {
          try {
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
                  eq(studentProgress.studentId, decoded.id),
                  getPublishedCourseFilter()
                )
              );
          } catch (error: any) {
            logger.warn('⚠️ student_progress table not accessible:', error?.message);
            return [];
          }
        }),
        retryDatabase(async () => {
          return await db
            .select({
              courseId: enrollments.courseId,
              progress: enrollments.progress,
              lastAccessed: enrollments.updatedAt,
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
            .from(enrollments)
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(
              and(
                eq(enrollments.userId, decoded.id),
                eq(enrollments.status, 'active'),
                getPublishedCourseFilter()
              )
            );
        }),
      ]);
    } catch (error: any) {
      logger.warn('⚠️ Error fetching enrolled courses:', error?.message);
      // Continue with empty arrays
    }

    // Merge data from both tables (prefer enrollments.progress)
    const mergedData = mergeEnrollmentData(allProgress, allEnrollments);

    // Filter out courses with pending requests
    // A course with a pending request should NOT be shown as enrolled
    const enrolledProgress = mergedData.filter((p: any) => 
      !pendingRequestCourseIds.includes(p.courseId)
    );

    logger.info(`✅ Student ${decoded.id}: Showing ${enrolledProgress.length} enrolled courses (merged from both tables, excluded ${mergedData.length - enrolledProgress.length} with pending requests)`);

    stopMonitoring();
    return NextResponse.json({
      enrolledCourses: enrolledProgress.map((p: any) => ({
        courseId: p.courseId.toString(),
        progress: p.progress || 0, // Use merged progress (prefers enrollments.progress)
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
