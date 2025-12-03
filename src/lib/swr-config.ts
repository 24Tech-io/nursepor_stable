/**
 * SWR Configuration
 * Provides default options for SWR data fetching with caching
 *
 * Note: Install SWR first: npm install swr
 */

// Default SWR configuration options
export const swrConfig = {
  // Revalidate on focus - refresh data when window regains focus
  revalidateOnFocus: true,

  // Revalidate on reconnect - refresh when network reconnects
  revalidateOnReconnect: true,

  // Don't revalidate on mount if data exists in cache
  revalidateIfStale: true,

  // Dedupe requests within this timeframe (ms)
  dedupingInterval: 2000,

  // Focus throttle interval (ms)
  focusThrottleInterval: 5000,

  // Error retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // Keep previous data while revalidating
  keepPreviousData: true,

  // Cache provider (can be customized)
  provider: undefined, // Use default cache
};

// Helper function to create SWR fetcher with credentials
export function swrFetcher(url: string) {
  return fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  });
}

// SWR key factories for common endpoints
export const swrKeys = {
  courses: (context?: string) => `/api/courses${context ? `?context=${context}` : ''}`,
  students: () => '/api/students',
  student: (id: number) => `/api/students/${id}`,
  enrollments: (studentId?: number) =>
    `/api/enrollments${studentId ? `?studentId=${studentId}` : ''}`,
  analytics: () => '/api/analytics/course-statistics',
  requests: () => '/api/admin/requests',
};
