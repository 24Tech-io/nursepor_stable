/**
 * Request Helper
 * High-level helper functions for request operations using DataManager
 */

import { dataManager } from '../core';
import { RequestOperations } from '../operations/requests';
import { RequestValidator } from '../validators/request-validator';
import { RequestApprovalParams, OperationResult } from '../types';

/**
 * Approve an access request
 */
export async function approveRequest(
  params: RequestApprovalParams
): Promise<OperationResult<{ approved: boolean; enrollmentCreated: boolean }>> {
  return await dataManager.executeOperation({
    type: 'approve_request',
    params,
    validator: async (p) =>
      await RequestValidator.validateRequestAction(p.requestId, p.adminId, 'approve'),
    executor: async (tx, p) => await RequestOperations.approveRequest(tx, p),
    retryable: true,
    maxRetries: 3,
  });
}

/**
 * Reject an access request
 */
export async function rejectRequest(
  params: RequestApprovalParams
): Promise<OperationResult<{ rejected: boolean }>> {
  return await dataManager.executeOperation({
    type: 'reject_request',
    params,
    validator: async (p) =>
      await RequestValidator.validateRequestAction(p.requestId, p.adminId, 'reject'),
    executor: async (tx, p) => await RequestOperations.rejectRequest(tx, p),
    retryable: false, // Rejections shouldn't retry
  });
}

/**
 * Create a new access request
 */
export async function createRequest(
  studentId: number,
  courseId: number,
  reason?: string
): Promise<OperationResult<{ requestId: number }>> {
  return await dataManager.executeOperation({
    type: 'create_request',
    params: { studentId, courseId, reason },
    validator: async (p) => await RequestValidator.validateRequestCreation(p.studentId, p.courseId),
    executor: async (tx, p) =>
      await RequestOperations.createRequest(tx, p.studentId, p.courseId, p.reason),
    retryable: false,
  });
}
