import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, accessRequests, enrollments, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { mergeEnrollmentData } from '@/lib/progress-utils';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createErrorResponse, createAuthError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    // Get database instance
    const db = getDatabase();

    // IMPORTANT: First get all pending request course IDs to exclude them
    // Also get approved requests - these should be treated as enrolled
    const [pendingRequests, approvedRequests] = await Promise.all([
      retryDatabase(async () => {
        return await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, decoded.id),
              eq(accessRequests.status, 'pending')
            )
          );
      }),
      retryDatabase(async () => {
        return await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, decoded.id),
              eq(accessRequests.status, 'approved')
            )
          );
      }),
    ]);

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);
    const approvedRequestCourseIds = approvedRequests.map((r: any) => r.courseId);
    
    console.log(`🔍 Student ${decoded.id}: Found ${pendingRequestCourseIds.length} pending requests and ${approvedRequestCourseIds.length} approved requests`);
    
    // For approved requests, ensure enrollment exists (sync)
    // CRITICAL: Only sync approved requests - don't treat them as enrolled until enrollment records exist
    if (approvedRequestCourseIds.length > 0) {
      const { syncEnrollmentAfterApproval } = await import('@/lib/enrollment-sync');
      for (const courseId of approvedRequestCourseIds) {
        try {
          // Check if already enrolled in either table
          const [existingProgress, existingEnrollment] = await Promise.all([
            retryDatabase(async () => {
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
            console.log(`🔄 Syncing enrollment for approved request: student ${decoded.id}, course ${courseId}`);
            await syncEnrollmentAfterApproval(decoded.id, courseId);
          }
        } catch (syncError: any) {
          console.error(`❌ Error syncing enrollment for course ${courseId}:`, syncError);
          // Continue with other courses - don't fail the entire request
        }
      }
    }

    // Get enrolled courses from BOTH tables
    // IMPORTANT: Exclude courses that have pending requests
    const [allProgress, allEnrollments] = await Promise.all([
      retryDatabase(async () => {
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

    // Merge data from both tables (prefer enrollments.progress)
    const mergedData = mergeEnrollmentData(allProgress, allEnrollments);

    // Filter out courses with pending requests
    // A course with a pending request should NOT be shown as enrolled
    const enrolledProgress = mergedData.filter((p: any) => 
      !pendingRequestCourseIds.includes(p.courseId)
    );

    console.log(`✅ Student ${decoded.id}: Showing ${enrolledProgress.length} enrolled courses (merged from both tables, excluded ${mergedData.length - enrolledProgress.length} with pending requests)`);

    return NextResponse.json({
      enrolledCourses: enrolledProgress.map((p: any) => ({
        courseId: p.courseId.toString(),
        progress: p.progress || 0, // Use merged progress (prefers enrollments.progress)
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed).toISOString() : null,
        course: p.course,
      })),
    });
  } catch (error: any) {
    console.error('❌ Get enrolled courses error:', error);
    return createErrorResponse(error, 'Failed to get enrolled courses');
  }
}
