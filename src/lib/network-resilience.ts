/**
 * Network Resilience Layer
 * Provides robust network operations with automatic retry and queue management
 */

import BackgroundSync from './background-sync';

interface RequestOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    queueOffline?: boolean;
}

interface NetworkQuality {
    effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
    downlink: number;
    rtt: number;
    saveData: boolean;
}

class NetworkResilienceManager {
    private requestCache = new Map<string, Promise<Response>>();
    private retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

    /**
     * Make a resilient fetch request with automatic retry
     */
    async fetch(url: string, options: RequestOptions = {}): Promise<Response> {
        const {
            timeout = 10000,
            retries = 3,
            retryDelay,
            queueOffline = true,
            ...fetchOptions
        } = options;

        // Check if offline and should queue
        if (!navigator.onLine && queueOffline && fetchOptions.method !== 'GET') {
            const queueId = await BackgroundSync.queueApiRequest(
                url,
                fetchOptions.method || 'POST',
                fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {}
            );

            throw new Error(`Offline: Request queued for background sync (ID: ${queueId})`);
        }

        // Deduplication for GET requests
        const cacheKey = `${fetchOptions.method || 'GET'}:${url}`;
        if (fetchOptions.method === 'GET' && this.requestCache.has(cacheKey)) {
            console.log('🔄 Using deduplicated request:', cacheKey);
            return this.requestCache.get(cacheKey)!;
        }

        // Create request promise
        const requestPromise = this.executeWithRetry(
            url,
            fetchOptions,
            timeout,
            retries,
            retryDelay
        );

        // Cache for deduplication
        if (fetchOptions.method === 'GET') {
            this.requestCache.set(cacheKey, requestPromise);
            requestPromise.finally(() => {
                setTimeout(() => this.requestCache.delete(cacheKey), 100);
            });
        }

        return requestPromise;
    }

    /**
     * Execute request with retry logic
     */
    private async executeWithRetry(
        url: string,
        options: RequestInit,
        timeout: number,
        retries: number,
        customDelay?: number
    ): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, options, timeout);

                // Check if response is ok
                if (!response.ok) {
                    // Retry on 5xx errors
                    if (response.status >= 500 && attempt < retries) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                }

                return response;
            } catch (error: any) {
                lastError = error;

                // Don't retry on client errors (4xx) or network offline
                if (error.name === 'AbortError' || !navigator.onLine) {
                    throw error;
                }

                // Don't retry if this was the last attempt
                if (attempt === retries) {
                    throw error;
                }

                // Calculate delay (exponential backoff)
                const delay = customDelay || this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];

                console.warn(`⚠️  Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }

        throw lastError || new Error('Request failed');
    }

    /**
     * Fetch with timeout
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeout: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Get network quality information
     */
    getNetworkQuality(): NetworkQuality | null {
        if (typeof window === 'undefined' || !('connection' in navigator)) {
            return null;
        }

        const conn = (navigator as any).connection;
        return {
            effectiveType: conn.effectiveType || 'unknown',
            downlink: conn.downlink || 0,
            rtt: conn.rtt || 0,
            saveData: conn.saveData || false,
        };
    }

    /**
     * Check if connection is fast
     */
    isFastConnection(): boolean {
        const quality = this.getNetworkQuality();
        if (!quality) return true; // Assume fast if unavailable

        return quality.effectiveType === '4g' && quality.downlink > 1;
    }

    /**
     * Check if data saver mode is enabled
     */
    isDataSaverEnabled(): boolean {
        const quality = this.getNetworkQuality();
        return quality?.saveData || false;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Prefetch resource
     */
    async prefetch(url: string): Promise<void> {
        if (!this.isFastConnection() || this.isDataSaverEnabled()) {
            console.log('⏸️  Skipping prefetch (slow connection or data saver)');
            return;
        }

        try {
            await this.fetch(url, { method: 'GET', priority: 'low' } as any);
            console.log('✅ Prefetched:', url);
        } catch (error) {
            console.warn('⚠️  Prefetch failed:', url, error);
        }
    }

    /**
     * Batch prefetch multiple URLs
     */
    async batchPrefetch(urls: string[], concurrency: number = 3): Promise<void> {
        const chunks: string[][] = [];
        for (let i = 0; i < urls.length; i += concurrency) {
            chunks.push(urls.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            await Promise.allSettled(chunk.map((url) => this.prefetch(url)));
        }
    }
}

// Singleton instance
const networkManager = new NetworkResilienceManager();

// Exported API
export const NetworkResilience = {
    /**
     * Make a resilient fetch request
     */
    fetch: (url: string, options?: RequestOptions) => networkManager.fetch(url, options),

    /**
     * Get network quality
     */
    getNetworkQuality: () => networkManager.getNetworkQuality(),

    /**
     * Check if fast connection
     */
    isFastConnection: () => networkManager.isFastConnection(),

    /**
     * Check if data saver is enabled
     */
    isDataSaverEnabled: () => networkManager.isDataSaverEnabled(),

    /**
     * Prefetch a resource
     */
    prefetch: (url: string) => networkManager.prefetch(url),

    /**
     * Batch prefetch URLs
     */
    batchPrefetch: (urls: string[], concurrency?: number) =>
        networkManager.batchPrefetch(urls, concurrency),
};

export default NetworkResilience;
