import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { enrollments, courses, accessRequests, studentProgress } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { requireStudentOrAdmin } from '@/lib/auth-helpers';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

/**
 * @api {get} /api/enrollments?studentId=:studentId
 * @description The single authoritative endpoint for fetching a student's enrolled courses.
 * This should be used by both the student dashboard and admin panels to ensure data consistency.
 * It replaces the logic previously found in `/api/student/enrolled-courses` and the stale data from `/api/students`.
 * 
 * @param {string} studentId - The ID of the student whose enrollments are being fetched.
 * 
 * @returns A list of enrollment objects, each containing course details and the student's progress.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ message: 'studentId is required' }, { status: 400 });
    }

    const studentIdNum = parseInt(studentId);

    // This helper will verify the token and ensure the user is either the student
    // themselves or an admin, preventing unauthorized access.
    const auth = await requireStudentOrAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const user = auth.user;

    const db = await getDatabaseWithRetry();

    // Get pending request course IDs to exclude them
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentIdNum),
          eq(accessRequests.status, 'pending')
        )
      );

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Query enrollments table (primary source of truth)
    let enrollmentData = await db
      .select({
        courseId: enrollments.courseId,
        progress: enrollments.progress,
        updatedAt: enrollments.updatedAt,
        course: {
          id: courses.id,
          title: courses.title,
          description: courses.description,
          thumbnail: courses.thumbnail,
          status: courses.status,
        },
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.userId, studentIdNum),
          eq(enrollments.status, 'active'),
          or(
            eq(courses.status, 'published'),
            eq(courses.status, 'active')
          )
        )
      );

    // TEMPORARY FALLBACK: If no enrollments found, check studentProgress table
    // This ensures students see their courses during migration period
    // Note: This fallback should be removed after migration is complete
    if (enrollmentData.length === 0) {
      logger.info(`⚠️ No enrollments found in enrollments table for student ${studentIdNum}, checking studentProgress as fallback...`);
      try {
        const progressData = await db
          .select({
            courseId: studentProgress.courseId,
            progress: studentProgress.totalProgress,
            lastAccessed: studentProgress.lastAccessed,
            course: {
              id: courses.id,
              title: courses.title,
              description: courses.description,
              thumbnail: courses.thumbnail,
              status: courses.status,
            },
          })
          .from(studentProgress)
          .innerJoin(courses, eq(studentProgress.courseId, courses.id))
          .where(
            and(
              eq(studentProgress.studentId, studentIdNum),
              or(
                eq(courses.status, 'published'),
                eq(courses.status, 'active')
              )
            )
          );

        // Convert studentProgress format to match enrollment format
        enrollmentData = progressData.map((p: any) => ({
          courseId: p.courseId,
          progress: p.progress || 0,
          updatedAt: p.lastAccessed,
          course: p.course,
        }));

        if (enrollmentData.length > 0) {
          logger.info(`✅ Found ${enrollmentData.length} enrollments in studentProgress table (fallback)`);
        }
      } catch (fallbackError: any) {
        logger.error('⚠️ Error checking studentProgress fallback:', fallbackError);
        // Continue with empty array if fallback fails
      }
    }

    // Format enrollment data
    const formattedEnrollments = enrollmentData.map((e: any) => ({
      courseId: e.courseId,
      progress: e.progress || 0,
      totalProgress: e.progress || 0,
      lastAccessed: e.updatedAt,
      course: e.course,
    }));

    // Filter out courses with pending requests
    const filteredEnrollments = formattedEnrollments.filter(
      (e: any) => !pendingRequestCourseIds.includes(e.courseId)
    );

    // Sort by lastAccessed (most recent first)
    filteredEnrollments.sort((a: any, b: any) => {
      const dateA = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
      const dateB = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ enrollments: filteredEnrollments });

  } catch (error: any) {
    logger.error('❌ Error fetching enrollments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch enrollments', error: error.message },
      { status: 500 }
    );
  }
}
