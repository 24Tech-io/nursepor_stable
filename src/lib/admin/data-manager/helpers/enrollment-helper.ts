/**
 * Enrollment Helper
 * High-level helper functions for enrollment operations using DataManager
 */

import { dataManager } from '../core';
import { EnrollmentOperations } from '../operations/enrollment';
import { EnrollmentValidator } from '../validators/enrollment-validator';
import {
  EnrollmentParams,
  UnenrollmentParams,
  OperationResult,
  DualTableSyncResult,
} from '../types';

/**
 * Enroll a student in a course
 */
export async function enrollStudent(
  params: EnrollmentParams
): Promise<OperationResult<DualTableSyncResult>> {
  return await dataManager.executeOperation({
    type: 'enroll_student',
    params,
    validator: async (p) => await EnrollmentValidator.validateEnrollment(p),
    executor: async (tx, p) => await EnrollmentOperations.enrollStudent(tx, p),
    retryable: true,
    maxRetries: 3,
  });
}

/**
 * Unenroll a student from a course
 */
export async function unenrollStudent(
  params: UnenrollmentParams
): Promise<OperationResult<{ deleted: boolean }>> {
  return await dataManager.executeOperation({
    type: 'unenroll_student',
    params,
    validator: async (p) => await EnrollmentValidator.validateUnenrollment(p),
    executor: async (tx, p) => await EnrollmentOperations.unenrollStudent(tx, p),
    retryable: true,
    maxRetries: 3,
  });
}

/**
 * Sync enrollment state between tables
 */
export async function syncEnrollmentState(
  userId: number,
  courseId: number
): Promise<OperationResult<DualTableSyncResult>> {
  return await dataManager.executeOperation({
    type: 'sync_enrollment_state',
    params: { userId, courseId },
    executor: async (tx) => await EnrollmentOperations.syncEnrollmentState(tx, userId, courseId),
    retryable: false, // Sync operations shouldn't retry
  });
}
