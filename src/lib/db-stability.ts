/**
 * Database Stability Utilities
 * Ensures database connections are stable and handles failures gracefully
 */

import { getDatabase, getDatabaseWithRetry, checkDatabaseHealth, reconnectDatabase } from './db';
import { retryDatabase } from './retry';

/**
 * Execute database operation with stability checks
 */
export async function stableDbOperation<T>(
  operation: (db: any) => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;

  let lastError: any;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Get database connection (with retry if needed)
      const db = await getDatabaseWithRetry();

      // Check health before operation
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.warn('⚠️ Database health check failed, attempting reconnection...');
        await reconnectDatabase();
      }

      // Execute operation with retry logic
      return await retryDatabase(() => operation(db), {
        maxRetries: 2,
        initialDelay: retryDelay,
      });
    } catch (error: any) {
      lastError = error;
      attempt++;

      // If this was the last attempt, throw
      if (attempt > maxRetries) {
        console.error(`❌ Database operation failed after ${maxRetries} retries:`, error.message);
        throw error;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt);
      }

      console.warn(
        `⚠️ Database operation failed (attempt ${attempt}/${maxRetries + 1}), retrying...`,
        error.message
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError;
}

/**
 * Batch database operations with stability
 */
export async function stableBatchOperations<T>(
  operations: Array<(db: any) => Promise<T>>,
  options: {
    maxRetries?: number;
    parallel?: boolean;
  } = {}
): Promise<T[]> {
  const { maxRetries = 3, parallel = true } = options;

  const executeOperations = async (db: any) => {
    if (parallel) {
      return Promise.all(operations.map((op) => op(db)));
    } else {
      const results: T[] = [];
      for (const op of operations) {
        results.push(await op(db));
      }
      return results;
    }
  };

  return stableDbOperation(executeOperations, { maxRetries });
}

/**
 * Transaction wrapper with stability
 */
export async function stableTransaction<T>(
  operation: (db: any) => Promise<T>,
  options: {
    maxRetries?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3 } = options;

  return stableDbOperation(
    async (db: any) => {
      // Execute in transaction if supported
      // Note: Neon serverless may have transaction limitations
      return await operation(db);
    },
    { maxRetries }
  );
}

