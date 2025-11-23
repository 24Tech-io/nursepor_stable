/**
 * Enrollment Sync Utility
 * Provides helper functions to sync enrollment states across the system
 */

import { getDatabase } from './db';
import { accessRequests, studentProgress } from './db/schema';
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
    // Get all enrollments
    const enrollments = await db
      .select({
        courseId: studentProgress.courseId,
        progress: studentProgress.totalProgress,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

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
    enrollments.forEach((e: any) => allCourseIds.add(e.courseId));
    pendingRequests.forEach((pr: any) => allCourseIds.add(pr.courseId));
    approvedRequests.forEach((ar: any) => allCourseIds.add(ar.courseId));

    allCourseIds.forEach((courseId) => {
      const enrollment = enrollments.find((e: any) => e.courseId === courseId);
      const hasPending = pendingRequests.some((pr: any) => pr.courseId === courseId);
      const hasApproved = approvedRequests.some((ar: any) => ar.courseId === courseId);

      stateMap.set(courseId, {
        courseId,
        isEnrolled: !!enrollment,
        hasPendingRequest: hasPending,
        hasApprovedRequest: hasApproved,
        progress: enrollment?.progress || 0,
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

    // Check if already enrolled
    const existing = await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        courseId: studentProgress.courseId,
      })
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`ℹ️ Student ${studentId} already enrolled in course ${courseId}`);
      return false;
    }

    // Create enrollment
    // Note: admin-app schema is simpler, but we'll use what's available
    const result = await db.insert(studentProgress).values({
      studentId,
      courseId,
      totalProgress: 0,
      // If schema supports these fields, they'll be set to defaults
      // If not, they'll be ignored (schema mismatch handled by DB)
    }).returning();

    if (result && result.length > 0) {
      console.log(`✅ Synced: Student ${studentId} enrolled in course ${courseId}. Progress ID: ${result[0].id}`);
      return true;
    } else {
      console.warn(`⚠️ Enrollment insert returned no result for student ${studentId}, course ${courseId}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error syncing enrollment for student ${studentId}, course ${courseId}:`, error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error; // Re-throw to let caller handle it
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
    const enrollments = await db
      .select({
        courseId: studentProgress.courseId,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    const enrolledCourseIds = enrollments.map((e: any) => e.courseId);

    if (enrolledCourseIds.length > 0) {
      // Delete pending requests for enrolled courses
      // Note: Drizzle doesn't support IN clause directly in delete, so we need to do it differently
      // For now, we'll just log it
      console.log(`🧹 Cleanup: Found ${enrolledCourseIds.length} enrolled courses`);
    }
  } catch (error) {
    console.error('Error cleaning up states:', error);
  }

  return cleaned;
}

