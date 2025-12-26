/**
 * Standardized API Error Handling
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server';
import { log } from './logger-helper';

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  PAYMENT_SERVICE_UNAVAILABLE = 'PAYMENT_SERVICE_UNAVAILABLE',
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
  details?: any,
  path?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path,
    },
  };

  // Log error (but not in production for security)
  if (process.env.NODE_ENV === 'development') {
    log.error(`API Error [${code}]: ${message}`, details, { statusCode, path });
  } else {
    // In production, only log errors (not warnings/info)
    if (statusCode >= 500) {
      log.error(`API Error [${code}]: ${message}`, null, { statusCode, path });
    }
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle errors in API routes
 */
export function handleApiError(error: unknown, path?: string): NextResponse<ApiErrorResponse> {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.statusCode,
      error.details,
      path
    );
  }

  // Handle known error types
  if (error instanceof Error) {
    // Database errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        'Database operation failed',
        500,
        process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined,
        path
      );
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        400,
        undefined,
        path
      );
    }

    // Generic error
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      process.env.NODE_ENV === 'development' ? error.message : 'An internal error occurred',
      500,
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
      path
    );
  }

  // Unknown error type
  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    500,
    undefined,
    path
  );
}

/**
 * Convenience functions for common errors
 */
export const ApiErrors = {
  unauthorized: (message = 'Not authenticated') =>
    new ApiError(ErrorCode.UNAUTHORIZED, message, 401),
  
  forbidden: (message = 'Access denied') =>
    new ApiError(ErrorCode.FORBIDDEN, message, 403),
  
  notFound: (message = 'Resource not found') =>
    new ApiError(ErrorCode.NOT_FOUND, message, 404),
  
  validation: (message: string, details?: any) =>
    new ApiError(ErrorCode.VALIDATION_ERROR, message, 400, details),
  
  conflict: (message = 'Resource already exists') =>
    new ApiError(ErrorCode.CONFLICT, message, 409),
  
  rateLimit: (message = 'Too many requests') =>
    new ApiError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429),
  
  internal: (message = 'Internal server error', details?: any) =>
    new ApiError(ErrorCode.INTERNAL_ERROR, message, 500, details),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new ApiError(ErrorCode.SERVICE_UNAVAILABLE, message, 503),
};

