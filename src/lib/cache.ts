/**
 * In-Memory Cache System
 * Replaces Redis with a fast, production-ready in-memory cache
 * Works for single-instance deployments (perfect for development and small scale)
 */

// In-memory cache storage
const cache = new Map<string, { value: any; expiry?: number }>();
const sets = new Map<string, Set<string>>();
const hashes = new Map<string, Map<string, string>>();

// Cleanup interval to remove expired items
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, item] of entries) {
    if (item.expiry && now > item.expiry) {
      cache.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Helper to check if cache is available
 */
export function isCacheConnected(): boolean {
  return true; // In-memory cache is always available
}

/**
 * Get a value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const item = cache.get(key);
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    return item.value as T;
  } catch (error) {
    console.error(`Error getting key ${key} from cache:`, error);
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function setInCache(
  key: string,
  value: any,
  expirySeconds?: number
): Promise<boolean> {
  try {
    const item: { value: any; expiry?: number } = { value };
    
    if (expirySeconds) {
      item.expiry = Date.now() + (expirySeconds * 1000);
    }
    
    cache.set(key, item);
    return true;
  } catch (error) {
    console.error(`Error setting key ${key} in cache:`, error);
    return false;
  }
}

/**
 * Delete a key from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    cache.delete(key);
    return true;
  } catch (error) {
    console.error(`Error deleting key ${key} from cache:`, error);
    return false;
  }
}

/**
 * Check if a key exists
 */
export async function existsInCache(key: string): Promise<boolean> {
  try {
    const item = cache.get(key);
    if (!item) {
      return false;
    }
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      cache.delete(key);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking if key ${key} exists:`, error);
    return false;
  }
}

/**
 * Increment a counter
 */
export async function incrementCounter(
  key: string,
  expirySeconds?: number
): Promise<number> {
  try {
    const current = cache.get(key);
    const value = (current?.value || 0) + 1;
    
    const item: { value: number; expiry?: number } = { value };
    if (expirySeconds && !current) {
      item.expiry = Date.now() + (expirySeconds * 1000);
    } else if (current?.expiry) {
      item.expiry = current.expiry;
    }
    
    cache.set(key, item);
    return value;
  } catch (error) {
    console.error(`Error incrementing counter ${key}:`, error);
    return 0;
  }
}

/**
 * Get TTL (time to live) of a key
 */
export async function getTTL(key: string): Promise<number> {
  try {
    const item = cache.get(key);
    if (!item || !item.expiry) {
      return -1;
    }
    
    const ttl = Math.ceil((item.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  } catch (error) {
    console.error(`Error getting TTL for key ${key}:`, error);
    return -1;
  }
}

/**
 * Set expiry on an existing key
 */
export async function setExpiry(key: string, seconds: number): Promise<boolean> {
  try {
    const item = cache.get(key);
    if (!item) {
      return false;
    }
    
    item.expiry = Date.now() + (seconds * 1000);
    cache.set(key, item);
    return true;
  } catch (error) {
    console.error(`Error setting expiry for key ${key}:`, error);
    return false;
  }
}

/**
 * Get multiple keys at once
 */
export async function getMultipleFromCache<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    return keys.map(key => {
      const item = cache.get(key);
      if (!item) {
        return null;
      }
      if (item.expiry && Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }
      return item.value as T;
    });
  } catch (error) {
    console.error('Error getting multiple keys from cache:', error);
    return keys.map(() => null);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function deletePattern(pattern: string): Promise<number> {
  try {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;
    const allKeys = Array.from(cache.keys());
    
    for (const key of allKeys) {
      if (regex.test(key)) {
        cache.delete(key);
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error(`Error deleting pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Hash operations
 */
export async function setHashField(
  key: string,
  field: string,
  value: any
): Promise<boolean> {
  try {
    if (!hashes.has(key)) {
      hashes.set(key, new Map());
    }
    
    const hash = hashes.get(key)!;
    hash.set(field, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting hash field ${field} in ${key}:`, error);
    return false;
  }
}

export async function getHashField<T>(
  key: string,
  field: string
): Promise<T | null> {
  try {
    const hash = hashes.get(key);
    if (!hash) {
      return null;
    }
    
    const value = hash.get(field);
    if (!value) {
      return null;
    }
    
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error getting hash field ${field} from ${key}:`, error);
    return null;
  }
}

export async function getAllHashFields<T>(key: string): Promise<Record<string, T>> {
  try {
    const hash = hashes.get(key);
    if (!hash) {
      return {};
    }
    
    const result: Record<string, T> = {};
    const entries = Array.from(hash.entries());
    for (const [field, value] of entries) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch {
        // Skip invalid JSON
      }
    }
    return result;
  } catch (error) {
    console.error(`Error getting all hash fields from ${key}:`, error);
    return {};
  }
}

export async function deleteHashField(key: string, field: string): Promise<boolean> {
  try {
    const hash = hashes.get(key);
    if (!hash) {
      return false;
    }
    
    hash.delete(field);
    if (hash.size === 0) {
      hashes.delete(key);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting hash field ${field} from ${key}:`, error);
    return false;
  }
}

/**
 * Set operations (for suspicious IPs, etc.)
 */
export async function sadd(key: string, member: string): Promise<boolean> {
  try {
    if (!sets.has(key)) {
      sets.set(key, new Set());
    }
    sets.get(key)!.add(member);
    return true;
  } catch (error) {
    console.error(`Error adding member to set ${key}:`, error);
    return false;
  }
}

export async function sismember(key: string, member: string): Promise<number> {
  try {
    const set = sets.get(key);
    return set && set.has(member) ? 1 : 0;
  } catch (error) {
    console.error(`Error checking set membership:`, error);
    return 0;
  }
}

export async function srem(key: string, member: string): Promise<boolean> {
  try {
    const set = sets.get(key);
    if (!set) {
      return false;
    }
    set.delete(member);
    return true;
  } catch (error) {
    console.error(`Error removing member from set:`, error);
    return false;
  }
}

export async function smembers(key: string): Promise<string[]> {
  try {
    const set = sets.get(key);
    return set ? Array.from(set) : [];
  } catch (error) {
    console.error(`Error getting set members:`, error);
    return [];
  }
}

/**
 * Get all keys matching a pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  try {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchedKeys: string[] = [];
    const allKeys = Array.from(cache.keys());
    
    for (const key of allKeys) {
      if (regex.test(key)) {
        matchedKeys.push(key);
      }
    }
    
    return matchedKeys;
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
}

/**
 * Delete a key (alias for deleteFromCache for compatibility)
 */
export async function del(key: string): Promise<number> {
  try {
    const existed = cache.has(key);
    cache.delete(key);
    return existed ? 1 : 0;
  } catch (error) {
    console.error(`Error deleting key ${key}:`, error);
    return 0;
  }
}

/**
 * Set with expiry
 */
export async function setex(key: string, seconds: number, value: string): Promise<boolean> {
  try {
    cache.set(key, {
      value,
      expiry: Date.now() + (seconds * 1000)
    });
    return true;
  } catch (error) {
    console.error(`Error setting key with expiry:`, error);
    return false;
  }
}

/**
 * Simple get (returns string, not JSON)
 */
export async function get(key: string): Promise<string | null> {
  try {
    const item = cache.get(key);
    if (!item) {
      return null;
    }
    
    if (item.expiry && Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    return typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
  } catch (error) {
    console.error(`Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Expire/TTL operations
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  return setExpiry(key, seconds);
}

/**
 * Cache key namespaces for organization
 */
export const CacheKeys = {
  // Security namespaces
  BRUTE_FORCE_IP: (ip: string) => `security:brute-force:ip:${ip}`,
  BRUTE_FORCE_USERNAME: (username: string) => `security:brute-force:username:${username}`,
  BLOCKED_IP: (ip: string) => `security:blocked:ip:${ip}`,
  THREAT_SCORE: (ip: string) => `security:threat:score:${ip}`,
  CSRF_TOKEN: (sessionId: string) => `security:csrf:${sessionId}`,
  
  // Data caching namespaces
  COURSE: (id: number) => `cache:course:${id}`,
  COURSE_WITH_MODULES: (id: number) => `cache:course:modules:${id}`,
  USER_ENROLLMENTS: (userId: number) => `cache:user:enrollments:${userId}`,
  USER_PROGRESS: (userId: number, courseId: number) => `cache:user:${userId}:progress:${courseId}`,
  
  // Rate limiting
  RATE_LIMIT: (ip: string, path: string) => `ratelimit:${ip}:${path}`,
};

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    keys: cache.size,
    sets: sets.size,
    hashes: hashes.size,
    memoryUsage: process.memoryUsage?.().heapUsed || 0,
  };
}

/**
 * Clear all cache (for testing/development)
 */
export async function clearCache(): Promise<void> {
  cache.clear();
  sets.clear();
  hashes.clear();
}

console.log('✅ In-memory cache initialized (Redis-free mode)');

// Export compatible cache API
const cacheAPI = {
  get,
  set: async (key: string, value: string) => setInCache(key, value),
  del,
  setex,
  expire,
  keys,
  sadd,
  sismember,
  srem,
  smembers,
  hset: setHashField,
  hget: getHashField,
  hgetall: getAllHashFields,
  hdel: deleteHashField,
  incr: async (key: string) => incrementCounter(key),
};

export default cacheAPI;

