/**
 * Request Operations
 * Handles all access request-related database operations
 */

import { getDatabase } from '@/lib/db';
import { accessRequests, courses, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { RequestApprovalParams } from '../types';
import { EventType, RequestEvent } from '../events/event-types';
import { dataManager } from '../core';
import { EnrollmentOperations } from './enrollment';

export class RequestOperations {
  /**
   * Approve an access request
   * Creates enrollment and deletes the request
   */
  static async approveRequest(
    tx: any,
    params: RequestApprovalParams
  ): Promise<{ approved: boolean; enrollmentCreated: boolean }> {
    const { requestId, adminId, reason } = params;

    // Get request details
    const request = await tx
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      throw new Error(`Request ${requestId} not found`);
    }

    const requestData = request[0];

    if (requestData.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${requestData.status})`);
    }

    // Update request status
    await tx
      .update(accessRequests)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(accessRequests.id, requestId));

    // Create enrollment
    const enrollmentResult = await EnrollmentOperations.enrollStudent(tx, {
      userId: requestData.studentId,
      courseId: requestData.courseId,
      adminId,
      source: 'request_approval',
    });

    // CRITICAL: Verify enrollment was actually created in BOTH tables
    const verification = await EnrollmentOperations.verifyEnrollmentExists(
      tx,
      requestData.studentId,
      requestData.courseId
    );

    if (!verification.verified) {
      throw new Error(
        `Enrollment verification failed for student ${requestData.studentId}, course ${requestData.courseId}. ` +
        `Progress: ${verification.inProgress}, Enrollments: ${verification.inEnrollments}`
      );
    }

    // Only delete request if enrollment is verified in both tables
    await tx.delete(accessRequests).where(eq(accessRequests.id, requestId));

    // Emit event
    const event: RequestEvent = {
      type: EventType.REQUEST_APPROVED,
      timestamp: new Date(),
      adminId,
      requestId,
      studentId: requestData.studentId,
      courseId: requestData.courseId,
      reason,
      metadata: {
        enrollmentCreated: enrollmentResult.studentProgressCreated || enrollmentResult.enrollmentCreated,
      },
    };
    dataManager.emitEvent(event);

    return {
      approved: true,
      enrollmentCreated: enrollmentResult.studentProgressCreated || enrollmentResult.enrollmentCreated,
    };
  }

  /**
   * Reject an access request
   * Updates status and deletes the request
   */
  static async rejectRequest(
    tx: any,
    params: RequestApprovalParams
  ): Promise<{ rejected: boolean }> {
    const { requestId, adminId, reason } = params;

    // Get request details
    const request = await tx
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      throw new Error(`Request ${requestId} not found`);
    }

    const requestData = request[0];

    if (requestData.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${requestData.status})`);
    }

    // Update request status
    await tx
      .update(accessRequests)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(accessRequests.id, requestId));

    // Delete the request (it's been processed)
    await tx.delete(accessRequests).where(eq(accessRequests.id, requestId));

    // Emit event
    const event: RequestEvent = {
      type: EventType.REQUEST_REJECTED,
      timestamp: new Date(),
      adminId,
      requestId,
      studentId: requestData.studentId,
      courseId: requestData.courseId,
      reason,
    };
    dataManager.emitEvent(event);

    return { rejected: true };
  }

  /**
   * Create a new access request
   */
  static async createRequest(
    tx: any,
    studentId: number,
    courseId: number,
    reason?: string
  ): Promise<{ requestId: number }> {
    // Validate student exists
    const student = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (student.length === 0) {
      throw new Error(`Student ${studentId} does not exist`);
    }

    // Validate course exists
    const course = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (course.length === 0) {
      throw new Error(`Course ${courseId} does not exist`);
    }

    // Check if request already exists
    const existingRequest = await tx
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

    if (existingRequest.length > 0) {
      throw new Error(`Pending request already exists for student ${studentId} and course ${courseId}`);
    }

    // Create request
    const [newRequest] = await tx
      .insert(accessRequests)
      .values({
        studentId,
        courseId,
        reason: reason || '',
        status: 'pending',
      })
      .returning();

    // Emit event
    const event: RequestEvent = {
      type: EventType.REQUEST_CREATED,
      timestamp: new Date(),
      userId: studentId,
      requestId: newRequest.id,
      studentId,
      courseId,
      reason,
    };
    dataManager.emitEvent(event);

    return { requestId: newRequest.id };
  }
}

