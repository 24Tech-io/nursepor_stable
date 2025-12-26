/**
 * Data Cache Utility
 * 
 * Provides in-memory caching with TTL, sessionStorage backup,
 * request deduplication, and stale-while-revalidate pattern.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  stale?: boolean; // Mark as stale but still usable
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
  dedupe?: boolean; // Deduplicate in-flight requests
  useSessionStorage?: boolean; // Persist to sessionStorage
}

type Fetcher<T> = () => Promise<T>;

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();

// Track in-flight requests for deduplication
const inFlightRequests = new Map<string, Promise<any>>();

// Default TTL values (in milliseconds)
const DEFAULT_TTL = {
  user: 5 * 60 * 1000, // 5 minutes
  courses: 2 * 60 * 1000, // 2 minutes
  courseDetails: 5 * 60 * 1000, // 5 minutes
  progress: 60 * 1000, // 1 minute
  qbank: 3 * 60 * 1000, // 3 minutes
  stats: 2 * 60 * 1000, // 2 minutes
  requests: 60 * 1000, // 1 minute
};

/**
 * Get cached data or fetch if not cached/expired
 */
export async function getCachedData<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl = DEFAULT_TTL.courses,
    staleWhileRevalidate = true,
    dedupe = true,
    useSessionStorage = true,
  } = options;

  // Check if request is in-flight (deduplication)
  if (dedupe && inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  // Check memory cache
  const cached = memoryCache.get(key);
  const now = Date.now();

  if (cached) {
    const age = now - cached.timestamp;
    const isExpired = age > cached.ttl;

    if (!isExpired) {
      // Cache is valid, return immediately
      return cached.data as T;
    }

    // Cache is expired but still usable for stale-while-revalidate
    if (staleWhileRevalidate && age < cached.ttl * 2) {
      // Return stale data immediately, refresh in background
      const refreshPromise = refreshCache(key, fetcher, ttl, useSessionStorage);
      inFlightRequests.set(key, refreshPromise);
      refreshPromise.finally(() => {
        inFlightRequests.delete(key);
      });
      return cached.data as T;
    }
  }

  // Check sessionStorage if enabled
  if (useSessionStorage && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        const age = now - entry.timestamp;
        if (age < entry.ttl) {
          // Restore to memory cache
          memoryCache.set(key, entry);
          return entry.data;
        } else if (staleWhileRevalidate && age < entry.ttl * 2) {
          // Use stale data, refresh in background
          memoryCache.set(key, { ...entry, stale: true });
          const refreshPromise = refreshCache(key, fetcher, ttl, useSessionStorage);
          inFlightRequests.set(key, refreshPromise);
          refreshPromise.finally(() => {
            inFlightRequests.delete(key);
          });
          return entry.data;
        }
      }
    } catch (error) {
      console.warn('Failed to read from sessionStorage:', error);
    }
  }

  // No cache, fetch fresh data
  return refreshCache(key, fetcher, ttl, useSessionStorage);
}

/**
 * Refresh cache with fresh data
 */
async function refreshCache<T>(
  key: string,
  fetcher: Fetcher<T>,
  ttl: number,
  useSessionStorage: boolean
): Promise<T> {
  const promise = fetcher()
    .then((data) => {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        stale: false,
      };

      // Store in memory
      memoryCache.set(key, entry);

      // Store in sessionStorage if enabled
      if (useSessionStorage && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch (error) {
          console.warn('Failed to write to sessionStorage:', error);
          // Clear old entries if storage is full
          try {
            const keys = Object.keys(sessionStorage);
            const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
            if (cacheKeys.length > 50) {
              // Remove oldest entries
              cacheKeys.slice(0, 10).forEach((k) => {
                sessionStorage.removeItem(k);
              });
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      return data;
    })
    .catch((error) => {
      // Remove from in-flight on error
      inFlightRequests.delete(key);
      throw error;
    });

  // Track in-flight request
  inFlightRequests.set(key, promise);
  promise.finally(() => {
    inFlightRequests.delete(key);
  });

  return promise;
}

/**
 * Set cached data explicitly
 */
export function setCachedData<T>(key: string, data: T, ttl?: number): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl || DEFAULT_TTL.courses,
    stale: false,
  };

  memoryCache.set(key, entry);

  // Also store in sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to write to sessionStorage:', error);
    }
  }
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from sessionStorage:', error);
    }
  }
}

/**
 * Invalidate multiple cache entries by pattern
 */
export function invalidateCachePattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  // Clear from memory
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }

  // Clear from sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith('cache_') && regex.test(key.replace('cache_', ''))) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear sessionStorage pattern:', error);
    }
  }
}

/**
 * Prefetch data in background
 */
export function prefetchData<T>(key: string, fetcher: Fetcher<T>, ttl?: number): Promise<T> {
  return getCachedData(key, fetcher, {
    ttl: ttl || DEFAULT_TTL.courses,
    staleWhileRevalidate: true,
    dedupe: true,
  });
}

/**
 * Get stale data if available (for instant UI)
 */
export function getStaleData<T>(key: string): T | null {
  // Check memory cache
  const cached = memoryCache.get(key);
  if (cached) {
    return cached.data as T;
  }

  // Check sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        return entry.data;
      }
    } catch (error) {
      // Ignore errors
    }
  }

  return null;
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }
}

/**
 * Cached fetch wrapper
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit & { cacheKey?: string; ttl?: number } = {}
): Promise<T> {
  const { cacheKey, ttl, ...fetchOptions } = options;
  const key = cacheKey || url;

  return getCachedData(
    key,
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },
    {
      ttl: ttl || DEFAULT_TTL.courses,
      staleWhileRevalidate: true,
      dedupe: true,
    }
  );
}

// Export default TTL for convenience
export { DEFAULT_TTL };



