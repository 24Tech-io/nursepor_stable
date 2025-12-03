/**
 * Unified Enrollment Helpers
 * Standardized functions for enrollment data fetching across all APIs
 * Ensures consistency by querying both studentProgress and enrollments tables
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, courses, accessRequests } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Valid course statuses for published/active courses
 * Standardized across all queries
 */
export const VALID_COURSE_STATUSES = ['published', 'active'] as const;

/**
 * Course status filter condition
 * Can be used in queries to filter for published/active courses
 */
export function getPublishedCourseFilter() {
  return or(
    eq(courses.status, 'published'),
    eq(courses.status, 'active')
  );
}

/**
 * Get enrollment count for a student
 * Queries both studentProgress and enrollments tables
 * Excludes courses with pending requests
 * 
 * @param studentId - The student's user ID
 * @returns The count of enrolled courses (excluding pending requests)
 */
export async function getStudentEnrollmentCount(studentId: number): Promise<number> {
  try {
    const db = getDatabase();

    // Get pending request course IDs to exclude
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentId),
          eq(accessRequests.status, 'pending')
        )
      );

    const pendingRequestCourseIds = pendingRequests.map((r) => r.courseId);

    // Get enrolled course IDs from both tables
    const [enrolledProgress, enrolledRecords] = await Promise.all([
      db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, studentId)),
      db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, studentId),
            eq(enrollments.status, 'active')
          )
        ),
    ]);

    // Merge and deduplicate
    const allEnrolledCourseIds = new Set([
      ...enrolledProgress.map((e) => e.courseId),
      ...enrolledRecords.map((e) => e.courseId),
    ]);

    // Exclude pending requests
    const actualEnrolledCount = Array.from(allEnrolledCourseIds).filter(
      (courseId) => !pendingRequestCourseIds.includes(courseId)
    ).length;

    return actualEnrolledCount;
  } catch (error: any) {
    console.error('Error getting student enrollment count:', error);
    return 0;
  }
}

/**
 * Get course IDs for which a student has pending access requests
 * 
 * @param userId - The student's user ID
 * @returns Array of course IDs with pending requests
 */
export async function getPendingRequestCourseIds(userId: number): Promise<number[]> {
  try {
    const db = getDatabase();
    const requests = await db
      .select({ courseId: accessRequests.courseId })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, userId),
          eq(accessRequests.status, 'pending')
        )
      );

    return requests.map((r) => r.courseId);
  } catch (error: any) {
    console.error('Error getting pending request course IDs:', error);
    return [];
  }
}

/**
 * Get enrolled course IDs for a student
 * Queries both studentProgress and enrollments tables
 * 
 * @param userId - The student's user ID
 * @returns Array of enrolled course IDs
 */
export async function getEnrolledCourseIds(userId: number): Promise<number[]> {
  try {
    const db = getDatabase();

    const [enrolledProgress, enrolledRecords] = await Promise.all([
      db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, userId)),
      db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active')
          )
        ),
    ]);

    // Merge and deduplicate
    const allEnrolledCourseIds = new Set([
      ...enrolledProgress.map((e) => e.courseId),
      ...enrolledRecords.map((e) => e.courseId),
    ]);

    return Array.from(allEnrolledCourseIds);
  } catch (error: any) {
    console.error('Error getting enrolled course IDs:', error);
    return [];
  }
}

/**
 * Merge enrollment data from studentProgress and enrollments tables
 * Prefers enrollments table data when both exist
 */
function mergeEnrollmentData(
  progressData: Array<{ courseId: number; progress?: number; lastAccessed?: Date | null }>,
  enrollmentData: Array<{ courseId: number; progress?: number; lastAccessed?: Date | null }>
): Array<{ courseId: number; progress: number; lastAccessed: Date | null }> {
  const merged = new Map<number, { courseId: number; progress: number; lastAccessed: Date | null }>();

  // First, add all from enrollments table (preferred source)
  enrollmentData.forEach((e) => {
    merged.set(e.courseId, {
      courseId: e.courseId,
      progress: e.progress || 0,
      lastAccessed: e.lastAccessed || null,
    });
  });

  // Then, add any from studentProgress that aren't in enrollments
  progressData.forEach((p) => {
    if (!merged.has(p.courseId)) {
      merged.set(p.courseId, {
        courseId: p.courseId,
        progress: p.progress || 0,
        lastAccessed: p.lastAccessed || null,
      });
    } else {
      // Update lastAccessed if studentProgress is more recent
      const existing = merged.get(p.courseId)!;
      if (p.lastAccessed && (!existing.lastAccessed || p.lastAccessed > existing.lastAccessed)) {
        existing.lastAccessed = p.lastAccessed;
      }
    }
  });

  return Array.from(merged.values());
}

/**
 * Get comprehensive enrollment status for a student
 * Returns all courses with their enrollment status (enrolled, requested, available)
 * 
 * @param userId - The student's user ID
 * @returns Array of courses with enrollment status
 */
export async function getStudentEnrollmentStatus(userId: number) {
  const db = getDatabase();
  const allCourses = await db.select().from(courses).where(getPublishedCourseFilter());

  const [pendingRequests, enrolledProgress, enrolledRecords] = await Promise.all([
    db.select({ courseId: accessRequests.courseId, requestedAt: accessRequests.requestedAt, reason: accessRequests.reason })
      .from(accessRequests)
      .where(and(eq(accessRequests.studentId, userId), eq(accessRequests.status, 'pending'))),
    db.select({ courseId: studentProgress.courseId, progress: studentProgress.totalProgress, lastAccessed: studentProgress.lastAccessed })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, userId)),
    db.select({ courseId: enrollments.courseId, progress: enrollments.progress, lastAccessed: enrollments.updatedAt })
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active'))),
  ]);

  const pendingRequestCourseIds = new Set(pendingRequests.map(r => r.courseId));
  const mergedEnrollments = mergeEnrollmentData(enrolledProgress, enrolledRecords);
  const enrolledCourseIds = new Set(mergedEnrollments.map(e => e.courseId));

  const enrollmentStatus = allCourses.map(course => {
    const isEnrolled = enrolledCourseIds.has(course.id);
    const hasPendingRequest = pendingRequestCourseIds.has(course.id);
    const progressData = mergedEnrollments.find(e => e.courseId === course.id);
    const pendingRequestData = pendingRequests.find(r => r.courseId === course.id);

    let status: 'enrolled' | 'requested' | 'available' = 'available';
    if (isEnrolled) {
      status = 'enrolled';
    } else if (hasPendingRequest) {
      status = 'requested';
    }

    return {
      courseId: course.id,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing,
        status: course.status,
      },
      enrollmentStatus: status,
      progress: progressData?.progress || 0,
      lastAccessed: progressData?.lastAccessed || null,
      requestedAt: pendingRequestData?.requestedAt || null,
      reason: pendingRequestData?.reason || null,
    };
  });

  return enrollmentStatus;
}




