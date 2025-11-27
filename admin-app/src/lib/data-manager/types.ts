/**
 * Data Manager Types
 * Type definitions for the centralized data management system
 */

export interface DataOperation<T> {
  type: string;
  params: any;
  validator?: (params: any) => Promise<ValidationResult>;
  executor: (tx: any, params: any) => Promise<T>;
  onSuccess?: (result: T) => Promise<void>;
  onFailure?: (error: Error) => Promise<void>;
  retryable?: boolean;
  maxRetries?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
  operationId?: string;
  timestamp: Date;
}

export interface EnrollmentParams {
  userId: number;
  courseId: number;
  adminId?: number;
  source?: 'admin' | 'student' | 'payment' | 'request_approval';
}

export interface UnenrollmentParams {
  userId: number;
  courseId: number;
  adminId?: number;
  reason?: string;
}

export interface ProgressUpdateParams {
  userId: number;
  courseId: number;
  progress: number;
  source: 'chapter' | 'video' | 'quiz' | 'manual';
  metadata?: {
    chapterId?: number;
    videoId?: string;
    quizId?: number;
  };
}

export interface RequestApprovalParams {
  requestId: number;
  action: 'approve' | 'reject';
  adminId: number;
  reason?: string;
}

export interface DualTableSyncResult {
  studentProgressCreated: boolean;
  enrollmentCreated: boolean;
  studentProgressUpdated: boolean;
  enrollmentUpdated: boolean;
}

export interface EventData {
  type: string;
  entity: string;
  entityId: number;
  action: string;
  userId?: number;
  adminId?: number;
  metadata?: any;
  timestamp: Date;
}

