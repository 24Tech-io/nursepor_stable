/**
 * Unified Enrollment Helpers
 * Standardized functions for enrollment data fetching across all APIs
 * Ensures consistency by querying both studentProgress and enrollments tables
 */

import { getDatabaseWithRetry } from '@/lib/db';
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
    const db = await getDatabaseWithRetry();

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

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Get enrolled courses from both tables
    const [enrolledProgress, enrolledRecords] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, studentId),
            getPublishedCourseFilter()
          )
        ),
      db
        .select({
          courseId: enrollments.courseId,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, studentId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter()
          )
        ),
    ]);

    // Merge course IDs from both tables
    const allEnrolledCourseIds = new Set([
      ...enrolledProgress.map((p: any) => p.courseId),
      ...enrolledRecords.map((e: any) => e.courseId),
    ]);

    // Filter out courses with pending requests
    const actualEnrolledCourseIds = Array.from(allEnrolledCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    return actualEnrolledCourseIds.length;
  } catch (error: any) {
    console.error(`Error getting enrollment count for student ${studentId}:`, error);
    return 0;
  }
}

/**
 * Get enrollment status for all courses for a student
 * Returns enrolled/requested/available status for each course
 * 
 * @param studentId - The student's user ID
 * @returns Array of enrollment status objects for all courses
 */
export async function getStudentEnrollmentStatus(studentId: number): Promise<Array<{
  courseId: number;
  course: {
    id: number;
    title: string;
    description: string;
    status: string;
  };
  enrollmentStatus: 'enrolled' | 'requested' | 'available';
  progress: number;
  lastAccessed: Date | null;
  requestedAt: Date | null;
}>> {
  try {
    const db = await getDatabaseWithRetry();

    // Get all published/active courses
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        status: courses.status,
      })
      .from(courses)
      .where(getPublishedCourseFilter());

    // Get enrolled courses from both tables
    const [enrolledProgress, enrolledRecords, pendingRequests] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
          progress: studentProgress.totalProgress,
          lastAccessed: studentProgress.lastAccessed,
        })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, studentId)),
      db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
          lastAccessed: enrollments.updatedAt,
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, studentId),
            eq(enrollments.status, 'active')
          )
        ),
      db
        .select({
          courseId: accessRequests.courseId,
          requestedAt: accessRequests.requestedAt,
        })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, studentId),
            eq(accessRequests.status, 'pending')
          )
        ),
    ]);

    // Merge enrollment data (prefer enrollments table)
    const enrollmentMap = new Map<number, { progress: number; lastAccessed: Date | null }>();
    
    // Add from enrollments table (preferred source)
    enrolledRecords.forEach((e: any) => {
      enrollmentMap.set(e.courseId, {
        progress: e.progress || 0,
        lastAccessed: e.lastAccessed,
      });
    });

    // Add from studentProgress if not already in map
    enrolledProgress.forEach((p: any) => {
      if (!enrollmentMap.has(p.courseId)) {
        enrollmentMap.set(p.courseId, {
          progress: p.progress || 0,
          lastAccessed: p.lastAccessed,
        });
      } else {
        // Update lastAccessed if studentProgress is more recent
        const existing = enrollmentMap.get(p.courseId)!;
        if (p.lastAccessed && (!existing.lastAccessed || p.lastAccessed > existing.lastAccessed)) {
          existing.lastAccessed = p.lastAccessed;
        }
      }
    });

    // Create pending requests map
    const pendingRequestMap = new Map<number, Date>();
    pendingRequests.forEach((r: any) => {
      pendingRequestMap.set(r.courseId, r.requestedAt);
    });

    // Get approved requests (for reference, but don't treat as enrolled)
    const approvedRequests = await db
      .select({
        courseId: accessRequests.courseId,
        requestedAt: accessRequests.requestedAt,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentId),
          eq(accessRequests.status, 'approved')
        )
      );

    const approvedRequestMap = new Map<number, Date>();
    approvedRequests.forEach((r: any) => {
      approvedRequestMap.set(r.courseId, r.requestedAt);
    });

    // Build enrollment status for each course
    // CRITICAL: Only mark as "enrolled" if actual enrollment records exist in enrollmentMap
    // Approved requests without enrollment records should show as "requested" or "available"
    const enrollmentStatus = allCourses.map((course: any) => {
      const courseId = course.id;
      // Only check actual enrollment records - enrollmentMap only contains real enrollments
      const isEnrolled = enrollmentMap.has(courseId);
      const hasPendingRequest = pendingRequestMap.has(courseId);
      const hasApprovedRequest = approvedRequestMap.has(courseId);
      const progressData = enrollmentMap.get(courseId);

      let status: 'enrolled' | 'requested' | 'available' = 'available';
      // Only mark as enrolled if actual enrollment records exist
      if (isEnrolled && !hasPendingRequest) {
        status = 'enrolled';
      } else if (hasPendingRequest) {
        // Pending request takes priority
        status = 'requested';
      } else if (hasApprovedRequest) {
        // Approved request without enrollment - should be synced, but show as requested until enrollment exists
        status = 'requested';
      }

      return {
        courseId,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          status: course.status,
        },
        enrollmentStatus: status,
        progress: progressData?.progress || 0,
        lastAccessed: progressData?.lastAccessed || null,
        requestedAt: hasPendingRequest 
          ? pendingRequestMap.get(courseId) || null 
          : (hasApprovedRequest ? approvedRequestMap.get(courseId) || null : null),
      };
    });

    return enrollmentStatus;
  } catch (error: any) {
    console.error(`Error getting enrollment status for student ${studentId}:`, error);
    return [];
  }
}

/**
 * Get pending request course IDs for a student
 * 
 * @param studentId - The student's user ID
 * @returns Array of course IDs with pending requests
 */
export async function getPendingRequestCourseIds(studentId: number): Promise<number[]> {
  try {
    const db = await getDatabaseWithRetry();

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

    return pendingRequests.map((r: any) => r.courseId);
  } catch (error: any) {
    console.error(`Error getting pending requests for student ${studentId}:`, error);
    return [];
  }
}

/**
 * Get enrolled course IDs for a student (from both tables)
 * Excludes courses with pending requests
 * 
 * @param studentId - The student's user ID
 * @returns Array of enrolled course IDs
 */
export async function getEnrolledCourseIds(studentId: number): Promise<number[]> {
  try {
    const db = await getDatabaseWithRetry();

    // Get pending request course IDs to exclude
    const pendingRequestCourseIds = await getPendingRequestCourseIds(studentId);

    // Get enrolled courses from both tables
    const [enrolledProgress, enrolledRecords] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, studentId),
            getPublishedCourseFilter()
          )
        ),
      db
        .select({
          courseId: enrollments.courseId,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, studentId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter()
          )
        ),
    ]);

    // Merge course IDs from both tables
    const allEnrolledCourseIds = new Set([
      ...enrolledProgress.map((p: any) => p.courseId),
      ...enrolledRecords.map((e: any) => e.courseId),
    ]);

    // Filter out courses with pending requests
    const actualEnrolledCourseIds = Array.from(allEnrolledCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    return actualEnrolledCourseIds;
  } catch (error: any) {
    console.error(`Error getting enrolled course IDs for student ${studentId}:`, error);
    return [];
  }
}

