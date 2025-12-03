/**
 * Enrollment Operations
 * Handles all enrollment-related database operations with dual-table sync
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, accessRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { EnrollmentParams, UnenrollmentParams, DualTableSyncResult } from '../types';
import { EventType, EnrollmentEvent } from '../events/event-types';
import { dataManager } from '../core';

export class EnrollmentOperations {
  /**
   * Enroll a student in a course
   * Creates entries in both studentProgress and enrollments tables
   */
  static async enrollStudent(
    tx: any,
    params: EnrollmentParams
  ): Promise<DualTableSyncResult> {
    const result: DualTableSyncResult = {
      studentProgressCreated: false,
      enrollmentCreated: false,
      studentProgressUpdated: false,
      enrollmentUpdated: false,
    };

    // Check if studentProgress exists
    const existingProgress = await tx
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, params.userId),
          eq(studentProgress.courseId, params.courseId)
        )
      )
      .limit(1);

    if (existingProgress.length === 0) {
      // Create studentProgress
      await tx.insert(studentProgress).values({
        studentId: params.userId,
        courseId: params.courseId,
        completedChapters: '[]',
        watchedVideos: '[]',
        quizAttempts: '[]',
        totalProgress: 0,
        lastAccessed: new Date(),
      });
      result.studentProgressCreated = true;
    } else {
      result.studentProgressUpdated = true;
    }

    // Check if enrollment exists
    const existingEnrollment = await tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, params.userId),
          eq(enrollments.courseId, params.courseId)
        )
      )
      .limit(1);

    if (existingEnrollment.length === 0) {
      // Create enrollment
      await tx.insert(enrollments).values({
        userId: params.userId,
        courseId: params.courseId,
        status: 'active',
        progress: 0,
        enrolledAt: new Date(),
      });
      result.enrollmentCreated = true;
    } else {
      // Update enrollment status to active if it was inactive
      if (existingEnrollment[0].status !== 'active') {
        await tx
          .update(enrollments)
          .set({
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, existingEnrollment[0].id));
        result.enrollmentUpdated = true;
      }
    }

    // Clean up any pending requests for this enrollment
    await tx
      .delete(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, params.userId),
          eq(accessRequests.courseId, params.courseId),
          eq(accessRequests.status, 'pending')
        )
      );

    // Emit event
    const event: EnrollmentEvent = {
      type: EventType.ENROLLMENT_CREATED,
      timestamp: new Date(),
      userId: params.userId,
      adminId: params.adminId,
      studentId: params.userId,
      courseId: params.courseId,
      source: params.source || 'manual',
      metadata: {
        studentProgressCreated: result.studentProgressCreated,
        enrollmentCreated: result.enrollmentCreated,
      },
    };
    dataManager.emitEvent(event);

    return result;
  }

  /**
   * Unenroll a student from a course
   * Removes entries from both studentProgress and enrollments tables
   */
  static async unenrollStudent(
    tx: any,
    params: UnenrollmentParams
  ): Promise<{ deleted: boolean }> {
    // Delete from studentProgress
    const progressResult = await tx
      .delete(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, params.userId),
          eq(studentProgress.courseId, params.courseId)
        )
      );

    // Delete from enrollments
    const enrollmentResult = await tx
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.userId, params.userId),
          eq(enrollments.courseId, params.courseId)
        )
      );

    const deleted = progressResult !== undefined || enrollmentResult !== undefined;

    // Emit event
    const event: EnrollmentEvent = {
      type: EventType.ENROLLMENT_REMOVED,
      timestamp: new Date(),
      userId: params.userId,
      adminId: params.adminId,
      studentId: params.userId,
      courseId: params.courseId,
      source: 'admin',
      metadata: {
        reason: params.reason,
      },
    };
    dataManager.emitEvent(event);

    return { deleted };
  }

  /**
   * Verify enrollment exists in both tables
   * Returns detailed status of enrollment in each table
   */
  static async verifyEnrollmentExists(
    tx: any,
    userId: number,
    courseId: number
  ): Promise<{ inProgress: boolean; inEnrollments: boolean; verified: boolean }> {
    const [progressCheck, enrollmentCheck] = await Promise.all([
      tx.select({ id: studentProgress.id })
        .from(studentProgress)
        .where(and(eq(studentProgress.studentId, userId), eq(studentProgress.courseId, courseId)))
        .limit(1),
      tx.select({ id: enrollments.id })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
        .limit(1)
    ]);
    
    return {
      inProgress: progressCheck.length > 0,
      inEnrollments: enrollmentCheck.length > 0,
      verified: progressCheck.length > 0 && enrollmentCheck.length > 0
    };
  }

  /**
   * Sync enrollment state between tables
   * Ensures both tables have consistent data
   */
  static async syncEnrollmentState(
    tx: any,
    userId: number,
    courseId: number
  ): Promise<DualTableSyncResult> {
    const result: DualTableSyncResult = {
      studentProgressCreated: false,
      enrollmentCreated: false,
      studentProgressUpdated: false,
      enrollmentUpdated: false,
    };

    // Check both tables
    const [progress, enrollment] = await Promise.all([
      tx
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, userId),
            eq(studentProgress.courseId, courseId)
          )
        )
        .limit(1),
      tx
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, courseId)
          )
        )
        .limit(1),
    ]);

    // If enrollment exists but progress doesn't, create progress
    if (enrollment.length > 0 && progress.length === 0) {
      await tx.insert(studentProgress).values({
        studentId: userId,
        courseId: courseId,
        completedChapters: '[]',
        watchedVideos: '[]',
        quizAttempts: '[]',
        totalProgress: enrollment[0].progress || 0,
        lastAccessed: new Date(),
      });
      result.studentProgressCreated = true;
    }

    // If progress exists but enrollment doesn't, create enrollment
    if (progress.length > 0 && enrollment.length === 0) {
      await tx.insert(enrollments).values({
        userId: userId,
        courseId: courseId,
        status: 'active',
        progress: progress[0].totalProgress || 0,
        enrolledAt: new Date(),
      });
      result.enrollmentCreated = true;
    }

    // Sync progress values if both exist
    if (progress.length > 0 && enrollment.length > 0) {
      const progressValue = progress[0].totalProgress || 0;
      const enrollmentValue = enrollment[0].progress || 0;

      if (progressValue !== enrollmentValue) {
        // Update enrollment to match progress (progress is source of truth)
        await tx
          .update(enrollments)
          .set({
            progress: progressValue,
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, enrollment[0].id));
        result.enrollmentUpdated = true;
      }
    }

    return result;
  }
}

