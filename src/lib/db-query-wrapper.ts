/**
 * Database Query Wrapper with Error Handling and Timeout
 */

import { getDatabase } from './db';
import { errorHandler, ErrorType } from './error-handler';
import { withTimeout } from './api-timeout';
import { performanceMonitor } from './performance';

const DB_QUERY_TIMEOUT = 15000; // 15 seconds

/**
 * Execute database query with error handling and timeout
 */
export async function executeQuery<T>(
  queryFn: (db: any) => Promise<T>,
  context?: string
): Promise<T> {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    return await performanceMonitor.measure(`db-query-${context || 'unknown'}`, async () => {
      return await withTimeout(queryFn(db), DB_QUERY_TIMEOUT);
    });
  } catch (error: any) {
    // Classify and log error
    const errorInfo = errorHandler.logError(error, { context: context || 'database-query' });

    // Re-throw with user-friendly message
    const userError = new Error(errorHandler.getUserMessage(error, ErrorType.DATABASE));
    (userError as any).originalError = error;
    (userError as any).errorInfo = errorInfo;
    throw userError;
  }
}

/**
 * Execute transaction with error handling
 */
export async function executeTransaction<T>(
  transactionFn: (db: any) => Promise<T>,
  context?: string
): Promise<T> {
  try {
    const db = await getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    return await performanceMonitor.measure(`db-transaction-${context || 'unknown'}`, async () => {
      return await withTimeout(transactionFn(db), DB_QUERY_TIMEOUT * 2);
    });
  } catch (error: any) {
    const errorInfo = errorHandler.logError(error, { context: context || 'database-transaction' });
    const userError = new Error(errorHandler.getUserMessage(error, ErrorType.DATABASE));
    (userError as any).originalError = error;
    (userError as any).errorInfo = errorInfo;
    throw userError;
  }
}

