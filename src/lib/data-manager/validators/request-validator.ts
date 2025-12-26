/**
 * Request Validator
 * Validates access request operations before execution
 */

import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses, studentProgress, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationResult } from '../types';

export class RequestValidator {
  /**
   * Validate request approval/rejection
   */
  static async validateRequestAction(
    requestId: number,
    adminId: number,
    action: 'approve' | 'reject'
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const db = getDatabase();

      // Validate admin exists
      const admin = await db
        .select()
        .from(users)
        .where(and(eq(users.id, adminId), eq(users.role, 'admin')))
        .limit(1);

      if (admin.length === 0) {
        errors.push(`Admin ${adminId} does not exist or is not an admin`);
      }

      // Validate request exists
      const request = await db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.id, requestId))
        .limit(1);

      if (request.length === 0) {
        errors.push(`Request ${requestId} does not exist`);
      } else {
        if (request[0].status !== 'pending') {
          errors.push(`Request ${requestId} is not pending (status: ${request[0].status})`);
        }

        // If approving, check if already enrolled
        if (action === 'approve') {
          const [progress, enrollment] = await Promise.all([
            db
              .select({ id: studentProgress.id })
              .from(studentProgress)
              .where(
                and(
                  eq(studentProgress.studentId, request[0].studentId),
                  eq(studentProgress.courseId, request[0].courseId)
                )
              )
              .limit(1),
            db
              .select({ id: enrollments.id })
              .from(enrollments)
              .where(
                and(
                  eq(enrollments.userId, request[0].studentId),
                  eq(enrollments.courseId, request[0].courseId)
                )
              )
              .limit(1),
          ]);

          if (progress.length > 0 || enrollment.length > 0) {
            errors.push(
              `Student ${request[0].studentId} is already enrolled in course ${request[0].courseId}`
            );
          }
        }
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

  /**
   * Validate request creation
   */
  static async validateRequestCreation(
    studentId: number,
    courseId: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const db = getDatabase();

      // Validate student exists
      const student = await db
        .select()
        .from(users)
        .where(and(eq(users.id, studentId), eq(users.role, 'student')))
        .limit(1);

      if (student.length === 0) {
        errors.push(`Student ${studentId} does not exist`);
      }

      // Validate course exists
      const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);

      if (course.length === 0) {
        errors.push(`Course ${courseId} does not exist`);
      }

      // Check if already enrolled
      const [progress, enrollment] = await Promise.all([
        db
          .select()
          .from(studentProgress)
          .where(
            and(eq(studentProgress.studentId, studentId), eq(studentProgress.courseId, courseId))
          )
          .limit(1),
        db
          .select()
          .from(enrollments)
          .where(and(eq(enrollments.userId, studentId), eq(enrollments.courseId, courseId)))
          .limit(1),
      ]);

      if (progress.length > 0 || enrollment.length > 0) {
        errors.push(`Student ${studentId} is already enrolled in course ${courseId}`);
      }

      // Check if pending request already exists
      const pendingRequest = await db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, studentId),
            eq(accessRequests.courseId, courseId),
            eq(accessRequests.status, 'pending')
          )
        )
        .limit(1);

      if (pendingRequest.length > 0) {
        errors.push(
          `Pending request already exists for student ${studentId} and course ${courseId}`
        );
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
