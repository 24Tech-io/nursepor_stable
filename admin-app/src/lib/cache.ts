/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used for caching API responses to improve performance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries (should be called periodically)
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
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Create a singleton instance
const cache = new SimpleCache();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      cache.cleanup();
    },
    5 * 60 * 1000
  ); // 5 minutes
}

export default cache;

// Cache key helpers
export const CacheKeys = {
  courses: (context?: string) => `courses:${context || 'all'}`,
  courseStats: () => 'analytics:course-statistics',
  studentStats: (studentId: number) => `student:stats:${studentId}`,
};

// TTL constants (in milliseconds)
export const CacheTTL = {
  courses: 5 * 60 * 1000, // 5 minutes
  analytics: 1 * 60 * 1000, // 1 minute
  studentStats: 2 * 60 * 1000, // 2 minutes
};
