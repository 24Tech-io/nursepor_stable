/**
 * Progress Utilities
 * Standardized functions for retrieving progress and enrollment data from both tables
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface ProgressData {
  progress: number;
  totalProgress: number;
  lastAccessed: Date | null;
  source: 'enrollments' | 'studentProgress' | 'merged';
}

export interface EnrollmentStatus {
  isEnrolled: boolean;
  progress: number;
  lastAccessed: Date | null;
  hasPendingRequest: boolean;
}

/**
 * Get student progress for a specific course
 * Checks both tables, prefers enrollments.progress as source of truth
 */
export async function getStudentProgress(
  userId: number,
  courseId: number
): Promise<ProgressData | null> {
  try {
    const db = getDatabase();

    // Get from enrollments table (new source of truth)
    const enrollmentData = await db
      .select({
        progress: enrollments.progress,
        updatedAt: enrollments.updatedAt,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    // Get from studentProgress table (legacy)
    const progressData = await db
      .select({
        totalProgress: studentProgress.totalProgress,
        lastAccessed: studentProgress.lastAccessed,
      })
      .from(studentProgress)
      .where(and(eq(studentProgress.studentId, userId), eq(studentProgress.courseId, courseId)))
      .limit(1);

    // Prefer enrollments.progress, fallback to studentProgress.totalProgress
    if (enrollmentData.length > 0) {
      return {
        progress: enrollmentData[0].progress || 0,
        totalProgress: enrollmentData[0].progress || 0,
        lastAccessed: enrollmentData[0].updatedAt,
        source: 'enrollments',
      };
    } else if (progressData.length > 0) {
      return {
        progress: progressData[0].totalProgress || 0,
        totalProgress: progressData[0].totalProgress || 0,
        lastAccessed: progressData[0].lastAccessed,
        source: 'studentProgress',
      };
    }

    return null;
  } catch (error: any) {
    console.error(`Error getting student progress for user ${userId}, course ${courseId}:`, error);
    return null;
  }
}

/**
 * Get enrollment status for a student in a course
 * Checks both tables and pending requests
 */
export async function getEnrollmentStatus(
  userId: number,
  courseId: number,
  pendingRequestCourseIds?: number[]
): Promise<EnrollmentStatus> {
  try {
    const db = getDatabase();

    // Check for pending request
    const hasPendingRequest = pendingRequestCourseIds
      ? pendingRequestCourseIds.includes(courseId)
      : false;

    // Get from enrollments table
    const enrollmentData = await db
      .select({
        progress: enrollments.progress,
        updatedAt: enrollments.updatedAt,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    // Get from studentProgress table
    const progressData = await db
      .select({
        totalProgress: studentProgress.totalProgress,
        lastAccessed: studentProgress.lastAccessed,
      })
      .from(studentProgress)
      .where(and(eq(studentProgress.studentId, userId), eq(studentProgress.courseId, courseId)))
      .limit(1);

    // Student is enrolled if record exists in either table AND no pending request
    const isEnrolled = (enrollmentData.length > 0 || progressData.length > 0) && !hasPendingRequest;

    // Get progress (prefer enrollments.progress)
    let progress = 0;
    let lastAccessed: Date | null = null;

    if (enrollmentData.length > 0) {
      progress = enrollmentData[0].progress || 0;
      lastAccessed = enrollmentData[0].updatedAt;
    } else if (progressData.length > 0) {
      progress = progressData[0].totalProgress || 0;
      lastAccessed = progressData[0].lastAccessed;
    }

    return {
      isEnrolled,
      progress,
      lastAccessed,
      hasPendingRequest,
    };
  } catch (error: any) {
    console.error(`Error getting enrollment status for user ${userId}, course ${courseId}:`, error);
    return {
      isEnrolled: false,
      progress: 0,
      lastAccessed: null,
      hasPendingRequest: false,
    };
  }
}

/**
 * Merge enrollment data from both tables
 * Prefers enrollments.progress as source of truth
 */
export function mergeEnrollmentData(progressData: any[], enrollmentData: any[]): any[] {
  const mergedMap = new Map();

  // First, add all from enrollments table (new source of truth)
  enrollmentData.forEach((e: any) => {
    const courseIdStr = e.courseId.toString();
    mergedMap.set(courseIdStr, {
      courseId: e.courseId,
      progress: e.progress || 0,
      totalProgress: e.progress || 0,
      lastAccessed: e.updatedAt || e.lastAccessed,
      course: e.course,
      source: 'enrollments',
    });
  });

  // Then, add any from studentProgress that aren't in enrollments (legacy data)
  progressData.forEach((p: any) => {
    const courseIdStr = p.courseId.toString();
    if (!mergedMap.has(courseIdStr)) {
      mergedMap.set(courseIdStr, {
        courseId: p.courseId,
        progress: p.totalProgress || 0,
        totalProgress: p.totalProgress || 0,
        lastAccessed: p.lastAccessed,
        course: p.course,
        source: 'studentProgress',
      });
    } else {
      // Already in map from enrollments, but update lastAccessed if studentProgress is more recent
      const existing = mergedMap.get(courseIdStr);
      if (p.lastAccessed && (!existing.lastAccessed || p.lastAccessed > existing.lastAccessed)) {
        existing.lastAccessed = p.lastAccessed;
      }
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Get all enrollments for a student (merged from both tables)
 */
export async function getAllStudentEnrollments(
  userId: number,
  excludePendingRequests: boolean = true,
  pendingRequestCourseIds?: number[]
): Promise<any[]> {
  try {
    const db = getDatabase();

    // Get from enrollments table
    const enrollmentData = await db
      .select({
        courseId: enrollments.courseId,
        progress: enrollments.progress,
        updatedAt: enrollments.updatedAt,
        course: {
          id: courses.id,
          title: courses.title,
          description: courses.description,
          instructor: courses.instructor,
          thumbnail: courses.thumbnail,
          status: courses.status,
        },
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active')))
      .limit(100);

    // Get from studentProgress table
    const progressData = await db
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
          status: courses.status,
        },
      })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(eq(studentProgress.studentId, userId))
      .limit(100);

    // Merge data
    const merged = mergeEnrollmentData(progressData, enrollmentData);

    // Filter out pending requests if requested
    if (excludePendingRequests && pendingRequestCourseIds) {
      return merged.filter((e: any) => !pendingRequestCourseIds.includes(e.courseId));
    }

    return merged;
  } catch (error: any) {
    console.error(`Error getting all student enrollments for user ${userId}:`, error);
    return [];
  }
}
