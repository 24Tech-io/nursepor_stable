/**
 * Unified Student Data Hook - Admin Version
 * Single hook for ALL student data needs in admin app
 *
 * Usage:
 *   const { courses, enrollments, stats, isLoading } = useStudentData(studentId);
 *
 * Same benefits as student version but for admin viewing student data
 */

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

export function useStudentData(studentId: number | null) {
  const { data, error, mutate, isLoading, isValidating } = useSWR(
    studentId ? `/api/unified/student-data?studentId=${studentId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  return {
    // Student info
    studentId: data?.studentId,

    // Enrollment data
    enrollments: data?.enrollments || [],
    enrolledCourseIds: (data?.enrollments || []).map((e: any) => e.courseId),

    // Request data
    requests: data?.requests || [],
    pendingRequests: (data?.requests || []).filter((r: any) => r.status === 'pending'),

    // Course data
    courses: data?.courses || [],

    // Stats
    stats: data?.stats || {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      pendingRequests: 0,
    },

    // Loading states
    isLoading,
    isValidating,
    error,

    // Utilities
    refresh: mutate,
    timestamp: data?.timestamp,

    // Helper methods
    isEnrolled: (courseId: number): boolean =>
      (data?.enrollments || []).some((e: any) => e.courseId === courseId),

    hasPendingRequest: (courseId: number): boolean =>
      (data?.requests || []).some((r: any) => r.courseId === courseId && r.status === 'pending'),
  };
}

