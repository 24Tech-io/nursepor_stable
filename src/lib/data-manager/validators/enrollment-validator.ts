/**
 * Enrollment Validator
 * Validates enrollment operations before execution
 */

import { getDatabase } from '@/lib/db';
import { users, courses, studentProgress, enrollments, accessRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationResult } from '../types';
import { EnrollmentParams, UnenrollmentParams } from '../types';

export class EnrollmentValidator {
  /**
   * Validate enrollment parameters
   */
  static async validateEnrollment(params: EnrollmentParams): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const db = getDatabase();

      // Validate user exists and is active
      const user = await db
        .select()
        .from(users)
        .where(and(eq(users.id, params.userId), eq(users.isActive, true)))
        .limit(1);

      if (user.length === 0) {
        errors.push(`User ${params.userId} does not exist or is not active`);
      } else if (user[0].role !== 'student') {
        errors.push(`User ${params.userId} is not a student`);
      }

      // Validate course exists and is published
      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, params.courseId))
        .limit(1);

      if (course.length === 0) {
        errors.push(`Course ${params.courseId} does not exist`);
      } else {
        const courseStatus = course[0].status?.toLowerCase();
        if (courseStatus !== 'published' && courseStatus !== 'active') {
          errors.push(`Course ${params.courseId} is not published (status: ${course[0].status})`);
        }
      }

      // Check if already enrolled
      const [existingProgress, existingEnrollment] = await Promise.all([
        db
          .select()
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, params.userId),
              eq(studentProgress.courseId, params.courseId)
            )
          )
          .limit(1),
        db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, params.userId),
              eq(enrollments.courseId, params.courseId)
            )
          )
          .limit(1),
      ]);

      if (existingProgress.length > 0 || existingEnrollment.length > 0) {
        errors.push(`User ${params.userId} is already enrolled in course ${params.courseId}`);
      }

      // Check for pending requests (warning only - will be cleaned up)
      const pendingRequest = await db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, params.userId),
            eq(accessRequests.courseId, params.courseId),
            eq(accessRequests.status, 'pending')
          )
        )
        .limit(1);

      if (pendingRequest.length > 0) {
        warnings.push(`Pending request exists for this enrollment - will be cleaned up`);
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }

  /**
   * Validate unenrollment parameters
   */
  static async validateUnenrollment(params: UnenrollmentParams): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const db = getDatabase();

      // Validate user exists
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      if (user.length === 0) {
        errors.push(`User ${params.userId} does not exist`);
      }

      // Validate course exists
      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, params.courseId))
        .limit(1);

      if (course.length === 0) {
        errors.push(`Course ${params.courseId} does not exist`);
      }

      // Check if enrolled (at least one table should have the record)
      const [existingProgress, existingEnrollment] = await Promise.all([
        db
          .select()
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, params.userId),
              eq(studentProgress.courseId, params.courseId)
            )
          )
          .limit(1),
        db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, params.userId),
              eq(enrollments.courseId, params.courseId)
            )
          )
          .limit(1),
      ]);

      if (existingProgress.length === 0 && existingEnrollment.length === 0) {
        errors.push(`User ${params.userId} is not enrolled in course ${params.courseId}`);
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }
}

