/**
 * Cache Client Configuration
 * Uses in-memory cache instead of Redis for simplicity and reliability
 * Perfect for development and single-instance deployments
 */

import * as memoryCache from './cache';

// Using in-memory cache - always available, no external dependencies
export const redis = {
  get: memoryCache.get,
  set: async (key: string, value: string) => memoryCache.setInCache(key, value),
  del: memoryCache.del,
  setex: memoryCache.setex,
  expire: memoryCache.expire,
  keys: memoryCache.keys,
  sadd: memoryCache.sadd,
  sismember: memoryCache.sismember,
  srem: memoryCache.srem,
  smembers: memoryCache.smembers,
  hset: memoryCache.setHashField,
  hget: memoryCache.getHashField,
  hgetall: memoryCache.getAllHashFields,
  hdel: memoryCache.deleteHashField,
  incr: async (key: string) => memoryCache.incrementCounter(key),
  ttl: memoryCache.getTTL,
};

// Helper to check if cache is available (always true for in-memory)
export function isRedisConnected(): boolean {
  return true;
}

/**
 * Helper function to safely get a value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  return memoryCache.getFromCache<T>(key);
}

/**
 * Helper function to safely set a value in cache
 */
export async function setInCache(
  key: string,
  value: any,
  expirySeconds?: number
): Promise<boolean> {
  return memoryCache.setInCache(key, value, expirySeconds);
}

/**
 * Helper function to delete a key from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  return memoryCache.deleteFromCache(key);
}

/**
 * Helper function to check if a key exists in cache
 */
export async function existsInCache(key: string): Promise<boolean> {
  return memoryCache.existsInCache(key);
}

/**
 * Helper function to increment a counter in cache
 */
export async function incrementCounter(key: string, expirySeconds?: number): Promise<number> {
  return memoryCache.incrementCounter(key, expirySeconds);
}

/**
 * Helper function to get TTL (time to live) of a key
 */
export async function getTTL(key: string): Promise<number> {
  return memoryCache.getTTL(key);
}

/**
 * Helper function to set expiry on an existing key
 */
export async function setExpiry(key: string, seconds: number): Promise<boolean> {
  return memoryCache.setExpiry(key, seconds);
}

/**
 * Helper function to get multiple keys at once
 */
export async function getMultipleFromCache<T>(keys: string[]): Promise<(T | null)[]> {
  return memoryCache.getMultipleFromCache<T>(keys);
}

/**
 * Helper function to delete all keys matching a pattern
 */
export async function deletePattern(pattern: string): Promise<number> {
  return memoryCache.deletePattern(pattern);
}

/**
 * Helper function to set a hash field
 */
export async function setHashField(key: string, field: string, value: any): Promise<boolean> {
  return memoryCache.setHashField(key, field, value);
}

/**
 * Helper function to get a hash field
 */
export async function getHashField<T>(key: string, field: string): Promise<T | null> {
  return memoryCache.getHashField<T>(key, field);
}

/**
 * Helper function to get all hash fields
 */
export async function getAllHashFields<T>(key: string): Promise<Record<string, T>> {
  return memoryCache.getAllHashFields<T>(key);
}

/**
 * Helper function to delete a hash field
 */
export async function deleteHashField(key: string, field: string): Promise<boolean> {
  return memoryCache.deleteHashField(key, field);
}

/**
 * Cache key namespaces for organization
 */
export const CacheKeys = memoryCache.CacheKeys;

// Export cache instance
export default redis;
