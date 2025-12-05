/**
 * Retry Utilities
 * Provides retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffMultiplier?: number;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryable'>> & {
  retryable?: (error: any) => boolean;
} = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Database connection errors
  if (
    error?.message?.includes('DATABASE_URL') ||
    error?.message?.includes('Database is not available') ||
    error?.message?.includes('connection') ||
    error?.message?.includes('ECONNREFUSED') ||
    error?.code === 'ECONNREFUSED' ||
    error?.cause?.code === 'ECONNREFUSED' ||
    error?.name === 'NeonDbError' ||
    (error?.message?.includes('fetch failed') && error?.cause)
  ) {
    return true;
  }

  // Network errors
  if (
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ENOTFOUND' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('network')
  ) {
    return true;
  }

  // PostgreSQL retryable errors
  if (
    error?.code === '40P01' || // Deadlock
    error?.code === '40001' || // Serialization failure
    error?.code === '57P03' // Cannot connect now
  ) {
    return true;
  }

  // Rate limiting (retry after delay)
  if (error?.code === '429' || error?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Calculate delay for retry attempt (exponential backoff)
 */
function calculateDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'retryable'>>
): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    retryable: options.retryable || isRetryableError,
  };

  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!opts.retryable(error)) {
        throw error; // Not retryable, throw immediately
      }

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, opts);
      console.log(
        `⚠️ Operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${delay}ms...`,
        error.message
      );

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Retry with custom condition
 */
export async function retryIf<T>(
  operation: () => Promise<T>,
  condition: (error: any) => boolean,
  options: Omit<RetryOptions, 'retryable'> = {}
): Promise<T> {
  return retry(operation, {
    ...options,
    retryable: condition,
  });
}

/**
 * Retry database operation
 */
export async function retryDatabase<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'retryable'> = {}
): Promise<T> {
  return retry(operation, {
    ...options,
    retryable: (error) => {
      // Only retry database connection errors
      return (
        isRetryableError(error) &&
        (error?.message?.includes('connection') ||
          error?.message?.includes('DATABASE_URL') ||
          error?.code === 'ECONNREFUSED' ||
          error?.name === 'NeonDbError')
      );
    },
  });
}



