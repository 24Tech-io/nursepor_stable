/**
 * Lightning-Fast API Client with Error Handling, Retry Logic, and Caching
 */

import { errorHandler, ErrorType } from './error-handler';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class APIClient {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private defaultTimeout = 10000; // 10 seconds
  private defaultRetries = 3;
  private defaultRetryDelay = 1000; // 1 second

  /**
   * Make API request with error handling, retry, and caching
   */
  async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      cache = false,
      cacheTTL = 60000, // 1 minute default
      ...fetchOptions
    } = options;

    // Check cache first
    if (cache && this.cache.has(url)) {
      const cached = this.cache.get(url)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data as T;
      }
      this.cache.delete(url);
    }

    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url)! as Promise<T>;
    }

    // Create request promise
    const requestPromise = this.executeRequest<T>(
      url,
      fetchOptions,
      timeout,
      retries,
      retryDelay
    );

    // Store pending request
    this.pendingRequests.set(url, requestPromise);

    try {
      const data = await requestPromise;

      // Cache response if enabled
      if (cache) {
        this.cache.set(url, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        });
      }

      return data;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(url);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Make request
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          credentials: 'include',
        });

        clearTimeout(timeoutId);

        // Handle response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}`);
          (error as any).status = response.status;
          (error as any).response = response;

          // Don't retry on client errors (4xx) except 408, 429
          if (response.status >= 400 && response.status < 500) {
            if (response.status !== 408 && response.status !== 429) {
              throw error;
            }
          }

          throw error;
        }

        // Parse response
        const data = await response.json();
        return data as T;
      } catch (error: any) {
        lastError = error;

        // Log error
        errorHandler.logError(error, {
          url,
          attempt: attempt + 1,
          maxRetries,
        });

        // Check if should retry
        if (attempt < maxRetries && errorHandler.isRetryable(error)) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        // Handle abort (timeout)
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Request timed out');
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size,
    };
  }
}

export const apiClient = new APIClient();

