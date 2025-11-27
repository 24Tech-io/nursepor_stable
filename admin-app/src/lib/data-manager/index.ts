/**
 * Data Manager - Main Export
 * Centralized data management system
 */

export { dataManager } from './core';
export { EnrollmentOperations } from './operations/enrollment';
export { ProgressOperations } from './operations/progress';
export { RequestOperations } from './operations/requests';
export { EnrollmentValidator } from './validators/enrollment-validator';
export { ProgressValidator } from './validators/progress-validator';
export { RequestValidator } from './validators/request-validator';
export { dataManagerEvents } from './events/event-emitter';
export * from './types';
export * from './events/event-types';

// Helper functions
export { enrollStudent, unenrollStudent, syncEnrollmentState } from './helpers/enrollment-helper';
export { updateProgress, markChapterComplete, submitQuiz } from './helpers/progress-helper';
export { approveRequest, rejectRequest, createRequest } from './helpers/request-helper';

