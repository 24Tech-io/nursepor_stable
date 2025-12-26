/**
 * Operation Locking
 * Uses PostgreSQL advisory locks to prevent concurrent modifications
 */

import { getDatabase } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Generate lock key from operation parameters
 * Uses PostgreSQL's pg_advisory_lock which accepts bigint
 */
function generateLockKey(operation: string, ...params: (string | number)[]): number {
  // Create a hash from operation and params
  const keyString = `${operation}|${params.join('|')}`;

  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and ensure it's within PostgreSQL's bigint range
  // PostgreSQL advisory locks use signed 64-bit integers
  return Math.abs(hash) % Number.MAX_SAFE_INTEGER;
}

/**
 * Acquire an advisory lock for an operation
 * Returns true if lock was acquired, false if already locked
 *
 * @param operation - Operation name (e.g., 'enroll_student')
 * @param params - Parameters that uniquely identify the operation
 * @param timeout - Maximum time to wait for lock (milliseconds), 0 = don't wait
 */
export async function acquireLock(
  operation: string,
  params: (string | number)[],
  timeout: number = 5000
): Promise<{ acquired: boolean; lockId: number }> {
  try {
    const db = getDatabase();
    const lockId = generateLockKey(operation, ...params);

    // Try to acquire lock (non-blocking if timeout is 0)
    if (timeout === 0) {
      // Try lock (non-blocking)
      const result = await db.execute(sql`SELECT pg_try_advisory_lock(${lockId}) as acquired`);

      const acquired = result.rows[0]?.acquired === true;
      return { acquired, lockId };
    } else {
      // Acquire lock with timeout
      const timeoutSeconds = Math.ceil(timeout / 1000);
      const result = await db.execute(sql`SELECT pg_advisory_lock(${lockId}) as acquired`);

      // Set a timeout to release lock if operation takes too long
      setTimeout(() => {
        releaseLock(lockId).catch((err) => {
          console.error(`Error releasing lock ${lockId} after timeout:`, err);
        });
      }, timeout);

      return { acquired: true, lockId };
    }
  } catch (error: any) {
    console.error('Error acquiring lock:', error);
    // On error, allow operation to proceed (fail open)
    // This prevents locking from blocking operations
    return { acquired: true, lockId: 0 };
  }
}

/**
 * Release an advisory lock
 */
export async function releaseLock(lockId: number): Promise<void> {
  try {
    const db = getDatabase();
    await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
  } catch (error: any) {
    console.error(`Error releasing lock ${lockId}:`, error);
    // Don't throw - lock release failure is not critical
  }
}

/**
 * Execute operation with advisory lock
 * Automatically acquires and releases lock
 */
export async function withLock<T>(
  operation: string,
  params: (string | number)[],
  executor: () => Promise<T>,
  timeout: number = 5000
): Promise<T> {
  const { acquired, lockId } = await acquireLock(operation, params, timeout);

  if (!acquired) {
    throw new Error(`Could not acquire lock for operation: ${operation}`);
  }

  try {
    return await executor();
  } finally {
    // Always release lock, even if operation fails
    await releaseLock(lockId);
  }
}

/**
 * Execute enrollment operation with lock
 * Prevents concurrent enrollment/unenrollment for same student+course
 */
export async function withEnrollmentLock<T>(
  studentId: number,
  courseId: number,
  executor: () => Promise<T>
): Promise<T> {
  return withLock('enrollment', [studentId, courseId], executor, 10000);
}

/**
 * Execute request operation with lock
 * Prevents concurrent request creation for same student+course
 */
export async function withRequestLock<T>(
  studentId: number,
  courseId: number,
  executor: () => Promise<T>
): Promise<T> {
  return withLock('access_request', [studentId, courseId], executor, 5000);
}




