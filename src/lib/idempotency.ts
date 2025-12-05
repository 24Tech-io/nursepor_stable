/**
 * Idempotency Support
 * Prevents duplicate processing of operations using idempotency keys
 */

import { getDatabase } from '@/lib/db';
import { idempotencyKeys } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  existingResult?: T;
  key: string;
}

/**
 * Generate idempotency key from operation and parameters
 */
export function generateIdempotencyKey(operation: string, params: Record<string, any>): string {
  // Sort params for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|');

  // Create hash-like key (simple approach - in production, use crypto)
  const keyString = `${operation}|${sortedParams}`;
  return Buffer.from(keyString).toString('base64').substring(0, 64);
}

/**
 * Check if operation was already processed (idempotency check)
 * Returns existing result if found, null if not processed yet
 */
export async function checkIdempotency<T = any>(
  key: string,
  operation: string
): Promise<IdempotencyResult<T> | null> {
  try {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.operation, operation),
          sql`${idempotencyKeys.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0];
      let existingResult: T | undefined;

      if (record.result) {
        try {
          existingResult = JSON.parse(record.result) as T;
        } catch (e) {
          console.error('Error parsing idempotency result:', e);
        }
      }

      return {
        isDuplicate: true,
        existingResult,
        key,
      };
    }

    return {
      isDuplicate: false,
      key,
    };
  } catch (error: any) {
    console.error('Error checking idempotency:', error);
    // On error, allow operation to proceed (fail open)
    // This prevents idempotency check from blocking operations
    return {
      isDuplicate: false,
      key,
    };
  }
}

/**
 * Store idempotency key with result
 * TTL defaults to 24 hours
 */
export async function storeIdempotencyKey<T = any>(
  key: string,
  operation: string,
  result: T,
  ttlHours: number = 24
): Promise<void> {
  try {
    const db = getDatabase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    await db
      .insert(idempotencyKeys)
      .values({
        key,
        operation,
        result: JSON.stringify(result),
        expiresAt,
      })
      .onConflictDoUpdate({
        target: idempotencyKeys.key,
        set: {
          result: sql`${idempotencyKeys.result}`,
          expiresAt: sql`${idempotencyKeys.expiresAt}`,
        },
      });
  } catch (error: any) {
    console.error('Error storing idempotency key:', error);
    // Don't throw - idempotency storage failure shouldn't break the operation
  }
}

/**
 * Execute operation with idempotency check
 * Returns existing result if operation was already processed
 */
export async function executeWithIdempotency<T = any>(
  operation: string,
  params: Record<string, any>,
  executor: () => Promise<T>,
  ttlHours: number = 24
): Promise<{ result: T; wasDuplicate: boolean }> {
  const key = generateIdempotencyKey(operation, params);

  // Check if already processed
  const idempotencyCheck = await checkIdempotency<T>(key, operation);

  if (idempotencyCheck?.isDuplicate && idempotencyCheck.existingResult !== undefined) {
    return {
      result: idempotencyCheck.existingResult,
      wasDuplicate: true,
    };
  }

  // Execute operation
  const result = await executor();

  // Store result for future idempotency checks
  await storeIdempotencyKey(key, operation, result, ttlHours);

  return {
    result,
    wasDuplicate: false,
  };
}

/**
 * Clean up expired idempotency keys (should be run periodically)
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const db = getDatabase();

    const result = await db
      .delete(idempotencyKeys)
      .where(sql`${idempotencyKeys.expiresAt} <= NOW()`);

    return result.rowCount || 0;
  } catch (error: any) {
    console.error('Error cleaning up expired idempotency keys:', error);
    return 0;
  }
}



