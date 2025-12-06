import { QueryClient } from '@tanstack/react-query';

// Shared QueryClient configuration to prevent duplicate requests and improve stability
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent automatic refetching on window focus (reduces duplicate requests)
        refetchOnWindowFocus: false,
        // Prevent automatic refetching on reconnect
        refetchOnReconnect: false,
        // Reduce retry attempts to prevent cascading failures
        retry: 1, // Only retry once instead of default 3
        // Increase stale time to reduce unnecessary refetches
        staleTime: 60 * 1000, // 1 minute
        // Cache time (formerly cacheTime)
        gcTime: 5 * 60 * 1000, // 5 minutes
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Reduce mutation retries
        retry: 0,
      },
    },
  });
}

// Singleton instance for sharing across the app
let queryClientInstance: QueryClient | undefined;

export function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

// Request deduplication to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

