/**
 * Unified Error Handler
 * Provides consistent error handling and response formatting across all APIs
 */

import { NextResponse } from 'next/server';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

export interface ErrorResponse {
  message: string;
  error?: string;
  type?: ErrorType;
  code?: string;
  details?: any;
  retryable?: boolean;
}

/**
 * Check if error is a database connection error
 */
export function isDatabaseConnectionError(error: any): boolean {
  return (
    error?.message?.includes('DATABASE_URL') ||
    error?.message?.includes('Database is not available') ||
    error?.message?.includes('connection') ||
    error?.message?.includes('ECONNREFUSED') ||
    error?.code === 'ECONNREFUSED' ||
    error?.cause?.code === 'ECONNREFUSED' ||
    error?.name === 'NeonDbError' ||
    (error?.message?.includes('fetch failed') && error?.cause)
  );
}

/**
 * Check if error is retryable (transient failure)
 */
export function isRetryableError(error: any): boolean {
  // Database connection errors are retryable
  if (isDatabaseConnectionError(error)) {
    return true;
  }

  // Network errors are retryable
  if (
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ENOTFOUND' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('network')
  ) {
    return true;
  }

  // Rate limiting errors are retryable (after delay)
  if (error?.code === '429' || error?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: any,
  defaultMessage: string = 'An error occurred',
  statusCode: number = 500
): NextResponse<ErrorResponse> {
  // Database connection errors
  if (isDatabaseConnectionError(error)) {
    return NextResponse.json(
      {
        message: 'Database connection error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        type: ErrorType.DATABASE,
        code: 'DB_CONNECTION_ERROR',
        retryable: true,
      },
      { status: 503 } // Service Unavailable
    );
  }

  // Validation errors (400)
  if (error?.status === 400 || error?.name === 'ValidationError') {
    return NextResponse.json(
      {
        message: error.message || defaultMessage,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        type: ErrorType.VALIDATION,
        code: error.code || 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    );
  }

  // Authentication errors (401)
  if (error?.status === 401 || error?.name === 'AuthenticationError') {
    return NextResponse.json(
      {
        message: error.message || 'Authentication required',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        type: ErrorType.AUTHENTICATION,
        code: error.code || 'AUTH_ERROR',
        retryable: false,
      },
      { status: 401 }
    );
  }

  // Authorization errors (403)
  if (error?.status === 403 || error?.name === 'AuthorizationError') {
    return NextResponse.json(
      {
        message: error.message || 'Access denied',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        type: ErrorType.AUTHORIZATION,
        code: error.code || 'AUTHZ_ERROR',
        retryable: false,
      },
      { status: 403 }
    );
  }

  // Not found errors (404)
  if (error?.status === 404 || error?.name === 'NotFoundError') {
    return NextResponse.json(
      {
        message: error.message || 'Resource not found',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        type: ErrorType.NOT_FOUND,
        code: error.code || 'NOT_FOUND',
        retryable: false,
      },
      { status: 404 }
    );
  }

  // Default: Internal server error
  const retryable = isRetryableError(error);
  return NextResponse.json(
    {
      message: defaultMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      type: ErrorType.INTERNAL,
      code: error.code || 'INTERNAL_ERROR',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              stack: error.stack,
              name: error.name,
            }
          : undefined,
      retryable,
    },
    { status: statusCode }
  );
}

/**
 * Create validation error response
 */
export function createValidationError(message: string, details?: any): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      message,
      type: ErrorType.VALIDATION,
      code: 'VALIDATION_ERROR',
      details,
      retryable: false,
    },
    { status: 400 }
  );
}

/**
 * Create authentication error response
 */
export function createAuthError(
  message: string = 'Authentication required'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      message,
      type: ErrorType.AUTHENTICATION,
      code: 'AUTH_ERROR',
      retryable: false,
    },
    { status: 401 }
  );
}

/**
 * Create authorization error response
 */
export function createAuthzError(message: string = 'Access denied'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      message,
      type: ErrorType.AUTHORIZATION,
      code: 'AUTHZ_ERROR',
      retryable: false,
    },
    { status: 403 }
  );
}

/**
 * Create not found error response
 */
export function createNotFoundError(
  message: string = 'Resource not found'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      message,
      type: ErrorType.NOT_FOUND,
      code: 'NOT_FOUND',
      retryable: false,
    },
    { status: 404 }
  );
}




