/**
 * Enrollment Sync Utility
 * Provides helper functions to sync enrollment states across the system
 */

import { getDatabase } from './db';
import { accessRequests, studentProgress, enrollments } from './db/schema';
import { eq, and } from 'drizzle-orm';

export interface EnrollmentState {
  courseId: number;
  isEnrolled: boolean;
  hasPendingRequest: boolean;
  hasApprovedRequest: boolean;
  progress?: number;
}

/**
 * Get complete enrollment state for a student
 */
export async function getStudentEnrollmentState(
  studentId: number
): Promise<Map<number, EnrollmentState>> {
  const db = getDatabase();
  const stateMap = new Map<number, EnrollmentState>();

  try {
    // Get all enrollments from studentProgress (legacy)
    const progressRecords = await db
      .select({
        courseId: studentProgress.courseId,
        progress: studentProgress.totalProgress,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    // Get all enrollments from enrollments table (new)
    const enrollmentRecords = await db
      .select({
        courseId: enrollments.courseId,
        progress: enrollments.progress,
      })
      .from(enrollments)
      .where(eq(enrollments.userId, studentId));

    // Get all pending requests
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

    // Get all approved requests
    const approvedRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentId),
          eq(accessRequests.status, 'approved')
        )
      );

    // Build state map
    const allCourseIds = new Set<number>();
    progressRecords.forEach((e: any) => allCourseIds.add(e.courseId));
    enrollmentRecords.forEach((e: any) => allCourseIds.add(e.courseId));
    pendingRequests.forEach((pr: any) => allCourseIds.add(pr.courseId));
    approvedRequests.forEach((ar: any) => allCourseIds.add(ar.courseId));

    allCourseIds.forEach((courseId) => {
      const progressRecord = progressRecords.find((e: any) => e.courseId === courseId);
      const enrollmentRecord = enrollmentRecords.find((e: any) => e.courseId === courseId);
      const hasPending = pendingRequests.some((pr: any) => pr.courseId === courseId);
      const hasApproved = approvedRequests.some((ar: any) => ar.courseId === courseId);

      stateMap.set(courseId, {
        courseId,
        isEnrolled: !!progressRecord || !!enrollmentRecord,
        hasPendingRequest: hasPending,
        hasApprovedRequest: hasApproved,
        progress: enrollmentRecord?.progress || progressRecord?.progress || 0,
      });
    });
  } catch (error) {
    console.error('Error getting enrollment state:', error);
  }

  return stateMap;
}

/**
 * Sync enrollment after request approval
 * Ensures student is enrolled if request was approved
 * Uses robust error handling to prevent partial failures
 */
export async function syncEnrollmentAfterApproval(
  studentId: number,
  courseId: number
): Promise<boolean> {
  try {
    console.log(`🔄 [syncEnrollmentAfterApproval] Starting sync for student ${studentId}, course ${courseId}`);

    const db = getDatabase();
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Validate inputs
    if (!studentId || !courseId) {
      throw new Error(`Invalid parameters: studentId=${studentId}, courseId=${courseId}`);
    }

    let created = false;

    // 1. Check/Create studentProgress (Legacy but required for progress tracking)
    const existingProgress = await db
      .select({
        id: studentProgress.id,
      })
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (existingProgress.length === 0) {
      try {
        await db.insert(studentProgress).values({
          studentId,
          courseId,
          completedChapters: '[]',
          watchedVideos: '[]',
          quizAttempts: '[]',
          totalProgress: 0,
        });
        console.log(`✅ Synced: Created studentProgress for student ${studentId}, course ${courseId}`);
        created = true;
      } catch (error: any) {
        // Check if it's a duplicate key error (race condition)
        if (error.code === '23505') {
          console.log(`ℹ️ studentProgress already exists (race condition)`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`ℹ️ studentProgress already exists for student ${studentId}, course ${courseId}`);
    }

    // 2. Check/Create enrollments (New source of truth)
    const existingEnrollment = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, studentId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (existingEnrollment.length === 0) {
      try {
        await db.insert(enrollments).values({
          userId: studentId,
          courseId,
          status: 'active',
          progress: 0,
        });
        console.log(`✅ Synced: Created enrollments record for student ${studentId}, course ${courseId}`);
        created = true;
      } catch (error: any) {
        // Check if it's a duplicate key error (race condition)
        if (error.code === '23505') {
          console.log(`ℹ️ enrollment already exists (race condition)`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`ℹ️ enrollment already exists for student ${studentId}, course ${courseId}`);
    }

    return created;
  } catch (error: any) {
    console.error(`❌ Error syncing enrollment for student ${studentId}, course ${courseId}:`, error);
    throw error;
  }
}

/**
 * Clean up inconsistent states
 * Removes pending requests for courses that are already enrolled
 */
export async function cleanupInconsistentStates(studentId: number): Promise<number> {
  const db = getDatabase();
  let cleaned = 0;

  try {
    // Get all enrollments
    const progressRecords = await db
      .select({
        courseId: studentProgress.courseId,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    const enrolledCourseIds = progressRecords.map((e: any) => e.courseId);

    if (enrolledCourseIds.length > 0) {
      // Delete pending requests for enrolled courses
      const result = await db
        .delete(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, studentId),
            eq(accessRequests.status, 'pending')
          )
        );

      console.log(`🧹 Cleanup: Found ${enrolledCourseIds.length} enrolled courses`);
    }
  } catch (error) {
    console.error('Error cleaning up states:', error);
  }

  return cleaned;
}
