/**
 * Comprehensive Error Handling System
 * Handles all types of errors with proper logging, recovery, and user feedback
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  DATABASE = 'DATABASE',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  retryable?: boolean;
  timestamp: Date;
}

class ErrorHandler {
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  /**
   * Classify error type
   */
  classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const message = String(error.message || error).toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorType.TIMEOUT;
    }
    if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      return ErrorType.DATABASE;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return ErrorType.AUTH;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any): boolean {
    const type = this.classifyError(error);
    return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.DATABASE].includes(type);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: any, type?: ErrorType): string {
    const errorType = type || this.classifyError(error);

    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Network connection error. Please check your internet connection and try again.';
      case ErrorType.TIMEOUT:
        return 'Request timed out. Please try again.';
      case ErrorType.DATABASE:
        return 'Database error occurred. Please try again in a moment.';
      case ErrorType.AUTH:
        return 'Authentication failed. Please log in again.';
      case ErrorType.VALIDATION:
        return 'Invalid input. Please check your data and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error
   */
  logError(error: any, context?: Record<string, any>): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type: this.classifyError(error),
      message: error?.message || String(error),
      originalError: error,
      context,
      retryable: this.isRetryable(error),
      timestamp: new Date(),
    };

    // Add to log (keep only recent errors)
    this.errorLog.push(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 Error:', errorInfo);
    }

    // Send to error tracking service in production (optional)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    }

    return errorInfo;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): ErrorInfo[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }
}

export const errorHandler = new ErrorHandler();

/**
 * Create standardized error responses for API routes
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  error?: any
): Response {
  const errorInfo = error ? errorHandler.logError(error) : null;
  return new Response(
    JSON.stringify({
      error: message,
      message: errorHandler.getUserMessage(error || new Error(message)),
      ...(process.env.NODE_ENV === 'development' && error ? { details: error.message } : {}),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create authentication error response
 */
export function createAuthError(message: string = 'Not authenticated'): Response {
  return createErrorResponse(message, 401);
}

/**
 * Create authorization error response
 */
export function createAuthzError(message: string = 'Access denied'): Response {
  return createErrorResponse(message, 403);
}

/**
 * Create validation error response
 */
export function createValidationError(message: string = 'Validation failed'): Response {
  return createErrorResponse(message, 400);
}

/**
 * Create not found error response
 */
export function createNotFoundError(message: string = 'Resource not found'): Response {
  return createErrorResponse(message, 404);
}
