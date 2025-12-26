/**
 * Safe Database Access Utilities
 * Provides robust error handling and retry logic for database operations
 */

import { getDatabase, getDatabaseWithRetry, isDatabaseAvailable } from './db';
import { retryDatabase, isRetryableError } from './retry';
import { createErrorResponse, isDatabaseConnectionError } from './error-handler';

/**
 * Safely execute a database operation with automatic retry
 */
export async function safeDbOperation<T>(
  operation: (db: any) => Promise<T>,
  options: {
    retry?: boolean;
    fallback?: T;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { retry = true, fallback, errorMessage = 'Database operation failed' } = options;

  try {
    // Get database with retry if needed
    const db = retry ? await getDatabaseWithRetry() : getDatabase();

    // Execute operation with retry logic if enabled
    if (retry) {
      return await retryDatabase(() => operation(db));
    }

    return await operation(db);
  } catch (error: any) {
    // Check if it's a connection error
    if (isDatabaseConnectionError(error)) {
      console.error('❌ Database connection error:', error.message);

      // If fallback provided, return it
      if (fallback !== undefined) {
        console.warn('⚠️ Using fallback value due to database error');
        return fallback;
      }

      // Otherwise, throw with helpful message
      throw new Error(
        'Database connection failed. Please check your DATABASE_URL configuration.'
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if database is available before operation
 */
export async function ensureDatabaseAvailable(): Promise<void> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database is not available. Please check your DATABASE_URL in .env.local');
  }

  // Try to get database with retry to ensure it's actually working
  try {
    await getDatabaseWithRetry();
  } catch (error: any) {
    throw new Error(
      'Database connection failed. Please check your DATABASE_URL configuration.'
    );
  }
}

/**
 * Wrap API handler with database error handling
 */
export function withDatabaseErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<any>,
  options: {
    requireDatabase?: boolean;
    fallbackResponse?: any;
  } = {}
) {
  const { requireDatabase = true, fallbackResponse } = options;

  return async (...args: T): Promise<any> => {
    try {
      // Check database availability if required
      if (requireDatabase) {
        await ensureDatabaseAvailable();
      }

      return await handler(...args);
    } catch (error: any) {
      // Handle database connection errors
      if (isDatabaseConnectionError(error)) {
        console.error('❌ Database error in API handler:', error.message);

        if (fallbackResponse) {
          return fallbackResponse;
        }

        return createErrorResponse(
          error,
          'Database connection error. Please try again later.',
          503
        );
      }

      // Re-throw other errors to be handled by outer error handler
      throw error;
    }
  };
}

