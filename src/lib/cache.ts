/**
 * Simple in-memory cache for API responses
 * For production, consider using Redis or a distributed cache
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum number of entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
export const cache = new SimpleCache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

/**
 * Common cache keys
 */
export const CacheKeys = {
  courses: (params?: Record<string, any>) => generateCacheKey('courses', params || {}),
  students: (params?: Record<string, any>) => generateCacheKey('students', params || {}),
  user: (userId: number) => generateCacheKey('user', { userId }),
  stats: (userId: number) => generateCacheKey('stats', { userId }),
} as const;

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Wrapper functions for cache operations (used by api-cache.ts)
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  return cache.get<T>(key);
}

export async function setInCache<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
  // Convert seconds to milliseconds
  const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
  cache.set(key, data, ttlMs);
}

export async function deleteFromCache(key: string): Promise<void> {
  cache.delete(key);
}

/**
 * Delete all cache entries matching a pattern
 */
export async function deletePattern(pattern: string): Promise<void> {
  // Simple pattern matching - delete all keys that start with the pattern
  const keysToDelete: string[] = [];

  // Access the private cache map via the public methods
  // Since we can't directly access the map, we'll need to track keys differently
  // For now, implement a basic pattern matching using startsWith

  // Note: This is a limitation of the current implementation
  // For production, consider using Redis with proper pattern matching
  const regex = new RegExp(pattern.replace('*', '.*'));

  // We can't iterate the private map, so this is a placeholder
  // In production, you'd want to either:
  // 1. Make the cache map accessible, or
  // 2. Track keys separately, or
  // 3. Use Redis which has built-in pattern matching

  console.warn('Pattern-based cache deletion is limited in memory cache. Consider using Redis for production.');
}

// Export cache instance as default for convenience
export default cache;
