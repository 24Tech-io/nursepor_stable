/**
 * Data Manager Core
 * Centralized data management layer with transactions, validation, and event emission
 */

import { getDatabase } from '@/lib/db';
import { DataOperation, OperationResult, ValidationResult } from './types';
import { dataManagerEvents } from './events/event-emitter';
import { EventType, DataManagerEvent } from './events/event-types';

export class DataManager {
  private static instance: DataManager;
  private operationCounter = 0;

  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * Execute a data operation with transaction, validation, and event emission
   */
  async executeOperation<T>(operation: DataOperation<T>): Promise<OperationResult<T>> {
    const operationId = `op_${Date.now()}_${++this.operationCounter}`;
    const startTime = Date.now();

    try {
      // Step 1: Validate parameters
      if (operation.validator) {
        const validation = await operation.validator(operation.params);
        if (!validation.valid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.errors?.join(', ') || 'Validation failed',
              details: validation.errors,
              retryable: false,
            },
            operationId,
            timestamp: new Date(),
          };
        }

        // Log warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
          console.warn(`⚠️ Validation warnings for ${operation.type}:`, validation.warnings);
        }
      }

      // Step 2: Execute operation in transaction
      const db = getDatabase();
      let result: T;

      try {
        result = await db.transaction(async (tx) => {
          return await operation.executor(tx, operation.params);
        });
      } catch (dbError: any) {
        // Check if it's a retryable error
        const isRetryable = this.isRetryableError(dbError);
        const shouldRetry = operation.retryable !== false && isRetryable;
        const maxRetries = operation.maxRetries || 3;

        if (shouldRetry && maxRetries > 0) {
          console.log(`🔄 Retrying operation ${operation.type} (operationId: ${operationId})`);
          // Retry logic will be handled by retry handler in Phase 3
          // For now, we'll just throw and let the caller handle retry
        }

        throw dbError;
      }

      // Step 3: Execute success callback
      if (operation.onSuccess) {
        await operation.onSuccess(result);
      }

      // Step 4: Emit success event (if operation defines event type)
      // Events are emitted by individual operation handlers, not here
      // This keeps event emission close to the actual data changes

      const duration = Date.now() - startTime;
      console.log(`✅ Operation ${operation.type} completed in ${duration}ms (operationId: ${operationId})`);

      return {
        success: true,
        data: result,
        operationId,
        timestamp: new Date(),
      };
    } catch (error: any) {
      // Step 5: Execute failure callback
      if (operation.onFailure) {
        await operation.onFailure(error);
      }

      const duration = Date.now() - startTime;
      console.error(`❌ Operation ${operation.type} failed after ${duration}ms (operationId: ${operationId}):`, error);

      return {
        success: false,
        error: {
          code: error.code || 'OPERATION_ERROR',
          message: error.message || 'Operation failed',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          retryable: this.isRetryableError(error),
        },
        operationId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // Database connection errors
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return true;
    }

    // Deadlock errors (PostgreSQL)
    if (error.code === '40P01') {
      return true;
    }

    // Serialization failures (PostgreSQL)
    if (error.code === '40001') {
      return true;
    }

    // Not retryable: validation errors, permission errors, constraint violations
    return false;
  }

  /**
   * Emit an event (helper method for operation handlers)
   */
  emitEvent(event: DataManagerEvent): void {
    dataManagerEvents.emitEvent(event);
  }

  /**
   * Get database instance (for operation handlers that need direct access)
   */
  getDatabase() {
    return getDatabase();
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();

