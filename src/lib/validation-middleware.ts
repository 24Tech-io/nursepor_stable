/**
 * Validation Middleware
 * Reusable validation functions for API requests
 */

import { createValidationError } from './error-handler';

/**
 * Validate student ID
 */
export function validateStudentId(studentId: any): {
  valid: boolean;
  error?: string;
  value?: number;
} {
  if (!studentId) {
    return { valid: false, error: 'Student ID is required' };
  }

  const id = typeof studentId === 'string' ? parseInt(studentId) : studentId;

  if (isNaN(id) || id <= 0) {
    return { valid: false, error: 'Invalid student ID' };
  }

  return { valid: true, value: id };
}

/**
 * Validate course ID
 */
export function validateCourseId(courseId: any): {
  valid: boolean;
  error?: string;
  value?: number;
} {
  if (!courseId) {
    return { valid: false, error: 'Course ID is required' };
  }

  const id = typeof courseId === 'string' ? parseInt(courseId) : courseId;

  if (isNaN(id) || id <= 0) {
    return { valid: false, error: 'Invalid course ID' };
  }

  return { valid: true, value: id };
}

/**
 * Validate enrollment request data
 */
export function validateEnrollmentRequest(data: any): {
  valid: boolean;
  error?: string;
  studentId?: number;
  courseId?: number;
} {
  const studentIdValidation = validateStudentId(data.studentId);
  if (!studentIdValidation.valid) {
    return { valid: false, error: studentIdValidation.error };
  }

  const courseIdValidation = validateCourseId(data.courseId);
  if (!courseIdValidation.valid) {
    return { valid: false, error: courseIdValidation.error };
  }

  return {
    valid: true,
    studentId: studentIdValidation.value,
    courseId: courseIdValidation.value,
  };
}

/**
 * Validate access request data
 */
export function validateAccessRequest(data: any): {
  valid: boolean;
  error?: string;
  courseId?: number;
  reason?: string;
} {
  const courseIdValidation = validateCourseId(data.courseId);
  if (!courseIdValidation.valid) {
    return { valid: false, error: courseIdValidation.error };
  }

  // Reason is optional, but if provided, should be a string
  if (data.reason !== undefined && typeof data.reason !== 'string') {
    return { valid: false, error: 'Reason must be a string' };
  }

  return {
    valid: true,
    courseId: courseIdValidation.value,
    reason: data.reason || undefined,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: { page?: any; limit?: any }): {
  valid: boolean;
  error?: string;
  page?: number;
  limit?: number;
} {
  let page = 1;
  let limit = 10;

  if (params.page !== undefined) {
    const pageNum = typeof params.page === 'string' ? parseInt(params.page) : params.page;
    if (isNaN(pageNum) || pageNum < 1) {
      return { valid: false, error: 'Invalid page number' };
    }
    page = pageNum;
  }

  if (params.limit !== undefined) {
    const limitNum = typeof params.limit === 'string' ? parseInt(params.limit) : params.limit;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return { valid: false, error: 'Invalid limit (must be between 1 and 100)' };
    }
    limit = limitNum;
  }

  return { valid: true, page, limit };
}

/**
 * Validate email format
 */
export function validateEmail(email: any): { valid: boolean; error?: string; value?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, value: email.trim().toLowerCase() };
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): { valid: boolean; error?: string; missing?: string[] } {
  const missing: string[] = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`,
      missing,
    };
  }

  return { valid: true };
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
  value: any,
  min?: number,
  max?: number
): { valid: boolean; error?: string; value?: number } {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Value must be a number' };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `Value must be at most ${max}` };
  }

  return { valid: true, value: num };
}
