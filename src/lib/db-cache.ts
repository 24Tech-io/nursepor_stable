/**
 * Database Query Caching with Redis
 * Implements caching strategies for high-read, low-write database queries
 */

import { CacheKeys, setInCache, getFromCache, deleteFromCache, deletePattern } from './redis';

/**
 * Cache wrapper for database queries
 * Automatically caches query results and invalidates on updates
 */
export async function cacheQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute query if not in cache
  const result = await queryFn();

  // Store in cache
  await setInCache(key, result, ttlSeconds);

  return result;
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(key: string): Promise<void> {
  await deleteFromCache(key);
}

/**
 * Invalidate multiple caches by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  await deletePattern(pattern);
}

/**
 * Course-specific cache functions
 */
export const CourseCache = {
  /**
   * Get course by ID (with caching)
   */
  async getCourse<T>(courseId: number, queryFn: () => Promise<T>): Promise<T> {
    const key = CacheKeys.COURSE(courseId);
    return cacheQuery(key, queryFn, 600); // 10 minutes
  },

  /**
   * Get course with modules (with caching)
   */
  async getCourseWithModules<T>(courseId: number, queryFn: () => Promise<T>): Promise<T> {
    const key = CacheKeys.COURSE_WITH_MODULES(courseId);
    return cacheQuery(key, queryFn, 300); // 5 minutes
  },

  /**
   * Invalidate course cache (call after update/delete)
   */
  async invalidate(courseId: number): Promise<void> {
    await invalidateCache(CacheKeys.COURSE(courseId));
    await invalidateCache(CacheKeys.COURSE_WITH_MODULES(courseId));
  },

  /**
   * Invalidate all course-related caches
   */
  async invalidateAll(): Promise<void> {
    await invalidateCachePattern('cache:course:*');
  },
};

/**
 * User enrollment cache functions
 */
export const EnrollmentCache = {
  /**
   * Get user enrollments (with caching)
   */
  async getUserEnrollments<T>(userId: number, queryFn: () => Promise<T>): Promise<T> {
    const key = CacheKeys.USER_ENROLLMENTS(userId);
    return cacheQuery(key, queryFn, 300); // 5 minutes
  },

  /**
   * Invalidate enrollment cache for a user
   */
  async invalidate(userId: number): Promise<void> {
    await invalidateCache(CacheKeys.USER_ENROLLMENTS(userId));
    await invalidateCachePattern(`cache:user:${userId}:progress:*`);
  },
};

/**
 * User progress cache functions
 */
export const ProgressCache = {
  /**
   * Get user progress for a course (with caching)
   */
  async getUserProgress<T>(
    userId: number,
    courseId: number,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const key = CacheKeys.USER_PROGRESS(userId, courseId);
    return cacheQuery(key, queryFn, 180); // 3 minutes (shorter TTL for progress)
  },

  /**
   * Invalidate progress cache for a user and course
   */
  async invalidate(userId: number, courseId: number): Promise<void> {
    await invalidateCache(CacheKeys.USER_PROGRESS(userId, courseId));
  },

  /**
   * Invalidate all progress for a user
   */
  async invalidateUser(userId: number): Promise<void> {
    await invalidateCachePattern(`cache:user:${userId}:progress:*`);
  },

  /**
   * Invalidate all progress for a course (when course content changes)
   */
  async invalidateCourse(courseId: number): Promise<void> {
    await invalidateCachePattern(`cache:user:*:progress:${courseId}`);
  },
};

/**
 * Generic cache strategy helpers
 */
export const CacheStrategy = {
  /**
   * Cache-aside pattern (most common)
   * Try cache first, then query DB, then cache result
   */
  async cacheAside<T>(key: string, queryFn: () => Promise<T>, ttl: number = 300): Promise<T> {
    return cacheQuery(key, queryFn, ttl);
  },

  /**
   * Write-through pattern
   * Update cache immediately after updating database
   */
  async writeThrough<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await setInCache(key, value, ttl);
  },

  /**
   * Write-behind pattern (lazy write)
   * Invalidate cache, let next read populate it
   */
  async writeBehind(key: string): Promise<void> {
    await deleteFromCache(key);
  },
};

/**
 * Cache warming - Pre-populate cache with frequently accessed data
 */
export async function warmCache(): Promise<void> {
  console.log('🔥 Starting cache warming...');

  // This function should be called on app startup to pre-populate cache
  // with frequently accessed data like:
  // - Popular courses
  // - Active users
  // - Common queries

  // Example: Warm up top 10 most popular courses
  // const popularCourses = await db.query.courses.findMany({ limit: 10, orderBy: popularity });
  // for (const course of popularCourses) {
  //   await setInCache(CacheKeys.COURSE(course.id), course, 600);
  // }

  console.log('✅ Cache warming complete');
}

/**
 * Cache statistics and monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

// Simple in-memory stats (consider moving to Redis for multi-instance deployments)
const cacheStats = {
  hits: 0,
  misses: 0,
};

export function recordCacheHit(): void {
  cacheStats.hits++;
}

export function recordCacheMiss(): void {
  cacheStats.misses++;
}

export function getCacheStats(): CacheStats {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: total > 0 ? cacheStats.hits / total : 0,
  };
}

export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
}
