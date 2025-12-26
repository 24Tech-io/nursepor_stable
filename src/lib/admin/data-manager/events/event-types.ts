/**
 * Event Types
 * All event types emitted by the DataManager
 */

export enum EventType {
  // Enrollment Events
  ENROLLMENT_CREATED = 'enrollment:created',
  ENROLLMENT_REMOVED = 'enrollment:removed',
  ENROLLMENT_UPDATED = 'enrollment:updated',

  // Progress Events
  PROGRESS_UPDATED = 'progress:updated',
  CHAPTER_COMPLETED = 'chapter:completed',
  VIDEO_COMPLETED = 'video:completed',
  QUIZ_SUBMITTED = 'quiz:submitted',

  // Request Events
  REQUEST_CREATED = 'request:created',
  REQUEST_APPROVED = 'request:approved',
  REQUEST_REJECTED = 'request:rejected',
  REQUEST_DELETED = 'request:deleted',

  // Payment Events
  PAYMENT_COMPLETED = 'payment:completed',
  PAYMENT_FAILED = 'payment:failed',

  // Course Events
  COURSE_CREATED = 'course:created',
  COURSE_UPDATED = 'course:updated',
  COURSE_DELETED = 'course:deleted',

  // User Events
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DEACTIVATED = 'user:deactivated',
}

export interface BaseEvent {
  type: EventType;
  timestamp: Date;
  userId?: number;
  adminId?: number;
  metadata?: any;
}

export interface EnrollmentEvent extends BaseEvent {
  type: EventType.ENROLLMENT_CREATED | EventType.ENROLLMENT_REMOVED | EventType.ENROLLMENT_UPDATED;
  studentId: number;
  courseId: number;
  source?: string;
}

export interface ProgressEvent extends BaseEvent {
  type:
    | EventType.PROGRESS_UPDATED
    | EventType.CHAPTER_COMPLETED
    | EventType.VIDEO_COMPLETED
    | EventType.QUIZ_SUBMITTED;
  studentId: number;
  courseId: number;
  progress: number;
  previousProgress?: number;
}

export interface RequestEvent extends BaseEvent {
  type:
    | EventType.REQUEST_CREATED
    | EventType.REQUEST_APPROVED
    | EventType.REQUEST_REJECTED
    | EventType.REQUEST_DELETED;
  requestId: number;
  studentId: number;
  courseId: number;
  reason?: string;
}

export type DataManagerEvent = EnrollmentEvent | ProgressEvent | RequestEvent | BaseEvent;
