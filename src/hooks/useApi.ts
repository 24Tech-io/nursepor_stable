/**
 * React Hook for API calls with error handling, loading states, and retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { errorHandler } from '@/lib/error-handler';
import { performanceMonitor } from '@/lib/performance';

interface UseApiOptions {
  immediate?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | undefined>;
  retry: () => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    immediate = false,
    cache = false,
    cacheTTL = 60000,
    timeout = 10000,
    retries = 3,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const apiCallRef = useRef(apiCall);

  // Update API call ref when it changes
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const result = await performanceMonitor.measure('api-call', async () => {
          return await apiCallRef.current(...args);
        });

        setData(result);
        if (onSuccess) onSuccess(result);
        return result;
      } catch (err: any) {
        // Don't set error if request was aborted
        if (err.name === 'AbortError') {
          return undefined;
        }

        const errorInfo = errorHandler.logError(err);
        const userError = new Error(errorHandler.getUserMessage(err, errorInfo.type));
        setError(userError);
        if (onError) onError(userError);
        throw userError;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const retry = useCallback(async (): Promise<T | undefined> => {
    return execute();
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate]); // Only run on mount if immediate is true

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset,
  };
}

