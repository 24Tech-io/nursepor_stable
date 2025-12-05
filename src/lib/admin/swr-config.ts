/**
 * SWR Configuration for Admin App
 * Provides default options for SWR data fetching with caching
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
};

// Helper function to create SWR fetcher with credentials
export function swrFetcher(url: string) {
  return fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      'Content-Type': 'application/json',
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = res.statusText || errorMessage;
        }
        console.error(`❌ SWR Fetcher Error [${url}]:`, errorMessage, `Status: ${res.status}`);
        throw new Error(errorMessage);
      }
      return res.json();
    })
    .catch((error) => {
      console.error(`❌ SWR Fetcher Network Error [${url}]:`, error);
      throw error;
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
  requests: () => '/api/requests',
  qbank: (courseId?: number) => `/api/qbank${courseId ? `?courseId=${courseId}` : ''}`,
};
