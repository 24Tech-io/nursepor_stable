/**
 * Debugging utilities for Q-Bank and Course functionality
 * Use these to add comprehensive logging and error detection
 */

import { logger } from './logger';

export interface DebugContext {
  endpoint: string;
  userId?: number;
  qbankId?: number;
  courseId?: number;
  action?: string;
}

/**
 * Log debug information with context
 */
export function debugLog(message: string, context: DebugContext, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    const contextStr = [
      context.endpoint,
      context.userId && `user:${context.userId}`,
      context.qbankId && `qbank:${context.qbankId}`,
      context.courseId && `course:${context.courseId}`,
      context.action,
    ].filter(Boolean).join(' | ');

    logger.info(`[DEBUG] ${contextStr} | ${message}`, data ? { data } : {});
  }
}

/**
 * Log errors with full context
 */
export function debugError(error: any, context: DebugContext, additionalData?: any) {
  logger.error(`[ERROR] ${context.endpoint}`, {
    error: error?.message || String(error),
    stack: error?.stack,
    context,
    ...additionalData,
  });
}

/**
 * Validate array access before use
 */
export function safeArrayAccess<T>(array: T[], index: number, context: DebugContext): T | null {
  if (!Array.isArray(array)) {
    debugError(new Error(`Expected array but got ${typeof array}`), context, { array, index });
    return null;
  }
  if (index < 0 || index >= array.length) {
    debugError(new Error(`Array index out of bounds: ${index} (length: ${array.length})`), context, { array, index });
    return null;
  }
  return array[index];
}

/**
 * Validate database result before accessing
 */
export function validateDbResult<T>(result: T[], context: DebugContext, minLength: number = 1): T[] {
  if (!Array.isArray(result)) {
    debugError(new Error(`Database query returned non-array: ${typeof result}`), context, { result });
    return [];
  }
  if (result.length < minLength) {
    debugLog(`Database query returned ${result.length} results, expected at least ${minLength}`, context, { result });
  }
  return result;
}

/**
 * Safe JSON parse with error logging
 */
export function safeJsonParseWithLog(value: any, fallback: any = null, context?: DebugContext): any {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error: any) {
    if (context) {
      debugError(error, context, { value, fallback });
    }
    return fallback;
  }
}

/**
 * Validate token and log issues
 */
export function debugTokenValidation(token: string | undefined, context: DebugContext): boolean {
  if (!token) {
    debugLog('No token provided', context);
    return false;
  }
  if (typeof token !== 'string') {
    debugError(new Error(`Token is not a string: ${typeof token}`), context, { token });
    return false;
  }
  if (token.length === 0) {
    debugLog('Token is empty string', context);
    return false;
  }
  return true;
}

/**
 * Validate Q-Bank ID
 */
export function validateQBankId(id: string | number | undefined, context: DebugContext): number | null {
  if (id === undefined || id === null) {
    debugLog('Q-Bank ID is undefined/null', context);
    return null;
  }
  const parsed = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(parsed) || parsed <= 0) {
    debugError(new Error(`Invalid Q-Bank ID: ${id}`), context, { id, parsed });
    return null;
  }
  return parsed;
}

/**
 * Validate enrollment exists
 */
export function validateEnrollment(enrollment: any[], context: DebugContext): boolean {
  if (!Array.isArray(enrollment)) {
    debugError(new Error('Enrollment is not an array'), context, { enrollment });
    return false;
  }
  if (enrollment.length === 0) {
    debugLog('No enrollment found', context);
    return false;
  }
  if (!enrollment[0]?.id) {
    debugError(new Error('Enrollment missing ID'), context, { enrollment });
    return false;
  }
  return true;
}




