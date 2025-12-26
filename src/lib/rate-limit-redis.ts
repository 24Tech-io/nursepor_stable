/**
 * In-Memory Rate Limiting (Default)
 * For serverless/edge environments where Redis may not be available
 * 
 * NOTE: This is the primary rate limiting implementation.
 * Redis support is optional and can be added at runtime if needed.
 * 
 * Usage:
 *   import { checkRateLimit } from '@/lib/rate-limit-redis';
 *   const result = await checkRateLimit(identifier, maxRequests, windowMs);
 */

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit using in-memory store
 * 
 * @param identifier - Unique identifier (e.g., IP address or user ID)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and remaining requests
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  const resetTime = now + windowMs;

  // Get or initialize the record for this identifier
  const record = rateLimitStore.get(key);
  
  if (!record || now >= record.resetTime) {
    // Clean up expired entry if it exists
    if (record && now >= record.resetTime) {
      rateLimitStore.delete(key);
    }
    
    // New time window or first request
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    
    // Periodically clean up other expired entries (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupExpiredEntries(now);
    }
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  }

  // Existing time window
  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment counter
  record.count++;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Clear rate limit for an identifier (useful for testing)
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  const key = `rate_limit:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries from the rate limit store to prevent memory leaks
 * @param now - Current timestamp
 */
function cleanupExpiredEntries(now: number): void {
  let cleanedCount = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime) {
      rateLimitStore.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired rate limit entries`);
  }
}

