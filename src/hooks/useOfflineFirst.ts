/**
 * useOfflineFirst Hook
 * React hook for offline-first data fetching with IndexedDB caching
 */

import { useState, useEffect, useCallback } from 'react';
import IndexedDB from '@/lib/indexed-db';
import NetworkResilience from '@/lib/network-resilience';

export interface OfflineFirstOptions<T> {
    cacheKey: string;
    storeName: 'courses' | 'quizzes' | 'videos' | 'userData';
    ttl?: number; // Time to live in milliseconds
    fetchOnMount?: boolean;
    refetchInterval?: number;
}

export interface OfflineFirstResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    fromCache: boolean;
    refetch: () => Promise<void>;
    sync: () => Promise<void>;
}

export function useOfflineFirst<T>(
    fetchFn: () => Promise<T>,
    options: OfflineFirstOptions<T>
): OfflineFirstResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [fromCache, setFromCache] = useState(false);

    const {
        cacheKey,
        storeName,
        ttl = 5 * 60 * 1000, // 5 minutes default
        fetchOnMount = true,
        refetchInterval,
    } = options;

    /**
     * Load from cache
     */
    const loadFromCache = useCallback(async () => {
        try {
            const cached: any = await IndexedDB.get(storeName, cacheKey);

            if (cached) {
                // Check if cache is still valid
                const age = Date.now() - (cached.lastAccessed || 0);
                if (age < ttl) {
                    setData(cached.data || cached);
                    setFromCache(true);
                    setLoading(false);
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.warn('Cache load failed:', err);
            return false;
        }
    }, [cacheKey, storeName, ttl]);

    /**
     * Fetch fresh data from network
     */
    const fetchFromNetwork = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const freshData = await fetchFn();

            // Save to cache
            const cacheData: any = {
                id: cacheKey,
                data: freshData,
                lastAccessed: Date.now(),
            };

            await IndexedDB.put(storeName, cacheData);

            setData(freshData);
            setFromCache(false);
            setLoading(false);
        } catch (err: any) {
            setError(err);
            setLoading(false);

            // If network fails, try to use stale cache
            const hasCache = await loadFromCache();
            if (!hasCache) {
                throw err;
            }
        }
    }, [fetchFn, cacheKey, storeName, loadFromCache]);

    /**
     * Refetch data (force network request)
     */
    const refetch = useCallback(async () => {
        await fetchFromNetwork();
    }, [fetchFromNetwork]);

    /**
     * Sync: Load from cache immediately, then fetch in background
     */
    const sync = useCallback(async () => {
        // Load from cache first for instant response
        const hasCache = await loadFromCache();

        // Then fetch fresh data in background
        fetchFromNetwork().catch((err) => {
            // Only set error if we don't have cached data
            if (!hasCache) {
                setError(err);
            }
        });
    }, [loadFromCache, fetchFromNetwork]);

    /**
     * Initial load
     */
    useEffect(() => {
        if (fetchOnMount) {
            sync();
        }
    }, [fetchOnMount, sync]);

    /**
     * Periodic refetch
     */
    useEffect(() => {
        if (!refetchInterval) return;

        const interval = setInterval(() => {
            if (navigator.onLine) {
                fetchFromNetwork();
            }
        }, refetchInterval);

        return () => clearInterval(interval);
    }, [refetchInterval, fetchFromNetwork]);

    return {
        data,
        loading,
        error,
        fromCache,
        refetch,
        sync,
    };
}
