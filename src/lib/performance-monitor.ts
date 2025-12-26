/**
 * Performance Monitoring Middleware
 * Tracks API response times, database query times, and cache performance
 * Provides metrics for monitoring and optimization
 */

import { logger } from './logger';

// Performance metrics storage
interface RouteMetrics {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
}

interface QueryMetrics {
  query: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
}

// In-memory metrics storage
const routeMetrics = new Map<string, RouteMetrics>();
const queryMetrics = new Map<string, QueryMetrics>();
const slowQueries: Array<{ route: string; query: string; duration: number; timestamp: number }> = [];
const slowRequests: Array<{ route: string; method: string; duration: number; timestamp: number }> = [];

// Configuration
const SLOW_QUERY_THRESHOLD = 100; // ms - warn if query takes >100ms
const SLOW_REQUEST_THRESHOLD = 100; // ms - warn if request takes >100ms
const ERROR_THRESHOLD = 500; // ms - error if request takes >500ms
const MAX_SLOW_ENTRIES = 100; // Keep last 100 slow queries/requests

/**
 * Start performance monitoring for a route
 */
export function startRouteMonitoring(route: string, method: string = 'GET'): () => void {
  const startTime = Date.now();
  const routeKey = `${method} ${route}`;

  return () => {
    const duration = Date.now() - startTime;
    recordRouteMetrics(routeKey, duration, false);
    
    // Track slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      addSlowRequest(routeKey, method, duration);
      
      if (duration > ERROR_THRESHOLD) {
        logger.error(`[Performance] Very slow request: ${routeKey} took ${duration}ms`);
      } else {
        logger.warn(`[Performance] Slow request: ${routeKey} took ${duration}ms`);
      }
    }
  };
}

/**
 * Record route metrics
 */
function recordRouteMetrics(route: string, duration: number, isError: boolean): void {
  const existing = routeMetrics.get(route) || {
    count: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  existing.count++;
  existing.totalTime += duration;
  existing.minTime = Math.min(existing.minTime, duration);
  existing.maxTime = Math.max(existing.maxTime, duration);
  if (isError) {
    existing.errors++;
  }

  routeMetrics.set(route, existing);
}

/**
 * Record database query metrics
 */
export function recordQueryMetrics(query: string, duration: number): void {
  const queryKey = query.substring(0, 100); // Truncate long queries
  
  const existing = queryMetrics.get(queryKey) || {
    query: queryKey,
    count: 0,
    totalTime: 0,
    minTime: Infinity,
    maxTime: 0,
  };

  existing.count++;
  existing.totalTime += duration;
  existing.minTime = Math.min(existing.minTime, duration);
  existing.maxTime = Math.max(existing.maxTime, duration);

  queryMetrics.set(queryKey, existing);

  // Track slow queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    addSlowQuery('unknown', queryKey, duration);
    logger.warn(`[Performance] Slow query (${duration}ms): ${queryKey.substring(0, 200)}`);
  }
}

/**
 * Add slow query to tracking
 */
function addSlowQuery(route: string, query: string, duration: number): void {
  slowQueries.push({
    route,
    query: query.substring(0, 500), // Truncate
    duration,
    timestamp: Date.now(),
  });

  // Keep only last N entries
  if (slowQueries.length > MAX_SLOW_ENTRIES) {
    slowQueries.shift();
  }
}

/**
 * Add slow request to tracking
 */
function addSlowRequest(route: string, method: string, duration: number): void {
  slowRequests.push({
    route,
    method,
    duration,
    timestamp: Date.now(),
  });

  // Keep only last N entries
  if (slowRequests.length > MAX_SLOW_ENTRIES) {
    slowRequests.shift();
  }
}

/**
 * Record cache hit
 */
export function recordCacheHit(route: string): void {
  const existing = routeMetrics.get(route);
  if (existing) {
    existing.cacheHits++;
  }
}

/**
 * Record cache miss
 */
export function recordCacheMiss(route: string): void {
  const existing = routeMetrics.get(route);
  if (existing) {
    existing.cacheMisses++;
  }
}

/**
 * Get performance statistics for a route
 */
export function getRouteStats(route: string): RouteMetrics | null {
  return routeMetrics.get(route) || null;
}

/**
 * Get all route statistics
 */
export function getAllRouteStats(): Map<string, RouteMetrics> {
  return routeMetrics;
}

/**
 * Get query statistics
 */
export function getQueryStats(): Map<string, QueryMetrics> {
  return queryMetrics;
}

/**
 * Get slow queries
 */
export function getSlowQueries(limit: number = 20): typeof slowQueries {
  return slowQueries.slice(-limit);
}

/**
 * Get slow requests
 */
export function getSlowRequests(limit: number = 20): typeof slowRequests {
  return slowRequests.slice(-limit);
}

/**
 * Calculate percentiles for a route
 */
export function calculatePercentiles(route: string): {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
} | null {
  const stats = routeMetrics.get(route);
  if (!stats || stats.count === 0) {
    return null;
  }

  // For now, return estimated percentiles based on min/max/avg
  // In production, you'd want to track individual durations
  const avg = stats.totalTime / stats.count;
  const p50 = avg * 0.8; // Estimate
  const p95 = avg * 1.5; // Estimate
  const p99 = stats.maxTime; // Use max as P99 estimate

  return { p50, p95, p99, avg };
}

/**
 * Get comprehensive performance summary
 */
export function getPerformanceSummary() {
  const routes = Array.from(routeMetrics.entries()).map(([route, stats]) => ({
    route,
    ...stats,
    avgTime: stats.totalTime / stats.count,
    errorRate: stats.errors / stats.count,
    cacheHitRate: (stats.cacheHits + stats.cacheMisses) > 0
      ? stats.cacheHits / (stats.cacheHits + stats.cacheMisses)
      : 0,
    percentiles: calculatePercentiles(route),
  }));

  const queries = Array.from(queryMetrics.entries()).map(([query, stats]) => ({
    query: stats.query,
    ...stats,
    avgTime: stats.totalTime / stats.count,
  }));

  return {
    routes: routes.sort((a, b) => b.avgTime - a.avgTime), // Sort by avg time descending
    queries: queries.sort((a, b) => b.avgTime - a.avgTime), // Sort by avg time descending
    slowQueries: getSlowQueries(10),
    slowRequests: getSlowRequests(10),
    summary: {
      totalRoutes: routeMetrics.size,
      totalQueries: queryMetrics.size,
      totalSlowQueries: slowQueries.length,
      totalSlowRequests: slowRequests.length,
    },
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  routeMetrics.clear();
  queryMetrics.clear();
  slowQueries.length = 0;
  slowRequests.length = 0;
}

/**
 * Wrapper for database queries with performance tracking
 */
export async function trackQuery<T>(
  queryDescription: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    recordQueryMetrics(queryDescription, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordQueryMetrics(queryDescription, duration);
    throw error;
  }
}

/**
 * Wrapper for API route handlers with performance tracking
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  route: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const stopMonitoring = startRouteMonitoring(route);
    try {
      const result = await handler(...args);
      stopMonitoring();
      return result;
    } catch (error) {
      stopMonitoring();
      const existing = routeMetrics.get(route);
      if (existing) {
        existing.errors++;
      }
      throw error;
    }
  }) as T;
}

