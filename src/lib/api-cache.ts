/**
 * Comprehensive API Caching Utility Wrapper
 * Provides unified caching layer for all API routes to achieve <100ms response times
 * 
 * Features:
 * - Request deduplication (prevent duplicate concurrent requests)
 * - Stale-while-revalidate (serve stale data while refreshing)
 * - Automatic cache invalidation
 * - Cache key generation
 * - Performance tracking
 */

import { getFromCache, setInCache, deleteFromCache } from './cache';
import { CacheKeys } from './cache-keys';
import { logger } from './logger';

// Re-export CacheKeys for convenience (import from one location)
export { CacheKeys, generateCacheKey, getCachePattern } from './cache-keys';

// Track in-flight requests for deduplication

const inFlightRequests = new Map<string, Promise<any>>();

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  deduplications: 0,
};

/**
 * Cache configuration with TTL defaults
 */
export const CacheTTL = {
  USER_DATA: 180, // 3 minutes
  COURSE_LIST: 300, // 5 minutes
  COURSE_DETAILS: 600, // 10 minutes
  PROGRESS_STATS: 120, // 2 minutes
  AUTH_TOKEN: 300, // 5 minutes
  ANALYTICS: 60, // 1 minute (shorter for real-time feel)
  QBANK: 300, // 5 minutes
  QUIZ: 180, // 3 minutes
  ADMIN_LIST: 180, // 3 minutes
  DEFAULT: 300, // 5 minutes
} as const;

/**
 * Cache options interface
 */
export interface CacheOptions {
  ttl?: number;
  key?: string;
  enabled?: boolean;
  staleWhileRevalidate?: boolean;
  dedupe?: boolean;
  skipCache?: boolean;
}

/**
 * Cache result with metadata
 */
export interface CacheResult<T> {
  data: T;
  cached: boolean;
  deduplicated: boolean;
}

/**
 * Main caching wrapper - wraps any async function with caching
 * 
 * @param cacheKey - Unique cache key
 * @param fetcher - Function that fetches the data
 * @param options - Cache options
 * @returns Cached or fresh data
 */
export async function withCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const {
    ttl = CacheTTL.DEFAULT,
    enabled = true,
    staleWhileRevalidate = true,
    dedupe = true,
    skipCache = false,
  } = options;

  // Skip caching if disabled or explicitly skipped
  if (!enabled || skipCache) {
    return fetcher();
  }

  // Check for in-flight request (deduplication)
  if (dedupe && inFlightRequests.has(cacheKey)) {
    cacheStats.deduplications++;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[Cache] Deduplicating request: ${cacheKey}`);
    }
    return inFlightRequests.get(cacheKey)!;
  }

  // Try to get from cache
  const cached = await getFromCache<T>(cacheKey);
  if (cached !== null) {
    cacheStats.hits++;

    // If stale-while-revalidate is enabled, refresh in background
    if (staleWhileRevalidate) {
      const refreshPromise = refreshCache(cacheKey, fetcher, ttl, dedupe);
      refreshPromise.catch((error) => {
        logger.warn(`[Cache] Background refresh failed for ${cacheKey}:`, error);
      });
    }

    return cached;
  }

  cacheStats.misses++;

  // Fetch fresh data
  return refreshCache(cacheKey, fetcher, ttl, dedupe);
}

/**
 * Refresh cache with fresh data
 */
async function refreshCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number,
  dedupe: boolean
): Promise<T> {
  // Create promise for this request
  const promise = fetcher()
    .then(async (data) => {
      // Store in cache
      await setInCache(cacheKey, data, ttl);
      return data;
    })
    .catch((error) => {
      // Remove from in-flight on error
      if (dedupe) {
        inFlightRequests.delete(cacheKey);
      }
      throw error;
    })
    .finally(() => {
      // Remove from in-flight when done
      if (dedupe) {
        inFlightRequests.delete(cacheKey);
      }
    });

  // Track in-flight request for deduplication
  if (dedupe) {
    inFlightRequests.set(cacheKey, promise);
  }

  return promise;
}

/**
 * Cache database query with automatic invalidation
 */
export async function cacheQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = CacheTTL.DEFAULT
): Promise<T> {
  return withCache(cacheKey, queryFn, { ttl });
}

/**
 * Cached authentication token verification
 */
export async function withAuthCache<T>(
  token: string,
  verifyFn: () => Promise<T>,
  ttl: number = CacheTTL.AUTH_TOKEN
): Promise<T> {
  const tokenHash = token.substring(0, 20);
  const cacheKey = CacheKeys.AUTH_TOKEN(tokenHash);
  return withCache(cacheKey, verifyFn, { ttl, dedupe: true });
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  await deleteFromCache(key);
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Cache] Invalidated: ${key}`);
  }
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateCaches(keys: string[]): Promise<void> {
  await Promise.all(keys.map(key => deleteFromCache(key)));
}

/**
 * Invalidate cache pattern (requires deletePattern from cache.ts)
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const { deletePattern } = await import('./cache');
  await deletePattern(pattern);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    deduplications: cacheStats.deduplications,
    hitRate: total > 0 ? cacheStats.hits / total : 0,
    totalRequests: total,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.deduplications = 0;
}

/**
 * Clear all in-flight requests (for testing)
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

/**
 * Pre-built cache wrappers for common use cases
 */
export const ApiCache = {
  /**
   * Cache user-specific data
   */
  user: <T>(userId: number, key: string, fetcher: () => Promise<T>, ttl?: number) => {
    const cacheKey = `cache:user:${userId}:${key}`;
    return withCache(cacheKey, fetcher, { ttl: ttl || CacheTTL.USER_DATA });
  },

  /**
   * Cache course data
   */
  course: <T>(courseId: number, key: string, fetcher: () => Promise<T>, ttl?: number) => {
    const cacheKey = `cache:course:${courseId}:${key}`;
    return withCache(cacheKey, fetcher, { ttl: ttl || CacheTTL.COURSE_DETAILS });
  },

  /**
   * Cache list data (with optional filters)
   */
  list: <T>(namespace: string, filters: string, fetcher: () => Promise<T>, ttl?: number) => {
    const cacheKey = `cache:list:${namespace}:${filters}`;
    return withCache(cacheKey, fetcher, { ttl: ttl || CacheTTL.COURSE_LIST });
  },

  /**
   * Cache analytics/statistics
   */
  stats: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
    const cacheKey = `cache:stats:${key}`;
    return withCache(cacheKey, fetcher, { ttl: ttl || CacheTTL.ANALYTICS });
  },
};

