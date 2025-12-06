/**
 * API Utility Functions
 * Provides retry logic, debouncing, and other common API utilities
 */

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create a debounced search function
 */
export function createDebouncedSearch(searchFn: (query: string) => void, delay: number = 300) {
  return debounce(searchFn, delay);
}

/**
 * Optimistic update helper
 */
export interface OptimisticUpdateOptions<T> {
  optimisticData: T;
  rollbackData: T;
  updateFn: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export async function optimisticUpdate<T>(options: OptimisticUpdateOptions<T>): Promise<T> {
  const { optimisticData, rollbackData, updateFn, onSuccess, onError } = options;

  try {
    const result = await updateFn();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error: any) {
    if (onError) {
      onError(error);
    }
    // Return rollback data to revert optimistic update
    return rollbackData;
  }
}




