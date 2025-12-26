/**
 * API Timeout Handler - Prevents lag and handles slow responses
 */

import { connectionMonitor } from './connection-monitor';

/**
 * Create a timeout promise that rejects after specified time
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Race between promise and timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number
): Promise<T> {
  const timeout = timeoutMs || connectionMonitor.getRecommendedTimeout();
  return Promise.race([promise, createTimeout(timeout)]);
}

/**
 * Retry with exponential backoff and timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const promise = fn();
      const result = timeout
        ? await withTimeout(promise, timeout)
        : await promise;
      return result;
    } catch (error: any) {
      lastError = error;

      // Don't retry on timeout if it's the last attempt
      if (attempt === maxRetries || error.message?.includes('timed out')) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

