/**
 * Unified Student Data Hook
 * Single hook for ALL student data needs
 * 
 * Usage:
 *   const { courses, enrollments, stats, isLoading } = useStudentData();
 * 
 * Benefits:
 * - Automatic caching via SWR
 * - Deduplication (multiple components can use same hook)
 * - Auto-refresh every 30s
 * - Revalidate on focus
 * - Manual refresh via mutate()
 */

import useSWR from 'swr';
import type { UnifiedStudentData } from '@/types/unified-data';

const fetcher = async (url: string): Promise<UnifiedStudentData> => {
  const response = await fetch(url, { 
    credentials: 'include',
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
};

export function useStudentData() {
  const { data, error, mutate, isLoading, isValidating } = useSWR<UnifiedStudentData>(
    '/api/unified/student-data',
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      revalidateOnFocus: true, // Refresh when user returns to tab
      revalidateOnReconnect: true, // Refresh on network reconnect
      dedupingInterval: 5000, // Prevent duplicate requests within 5s
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );
  
  return {
    // User info
    user: data?.user,
    
    // Enrollment data
    enrollments: data?.enrollments || [],
    enrolledCourseIds: data?.enrolledCourseIds || [],
    
    // Request data
    requests: data?.requests || [],
    pendingRequests: data?.pendingRequests || [],
    pendingRequestCourseIds: (data?.pendingRequests || []).map(r => r.courseId),
    
    // Course data
    courses: data?.courses || [],
    
    // Stats
    stats: data?.stats || {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      hoursLearned: 0,
      pendingRequests: 0,
    },
    
    // Loading states
    isLoading,
    isValidating,
    error,
    
    // Utilities
    refresh: mutate, // Manual refresh: call refresh() to force reload
    timestamp: data?.timestamp,
    
    // Helper methods
    isEnrolled: (courseId: number): boolean => 
      (data?.enrolledCourseIds || []).includes(courseId),
    
    hasPendingRequest: (courseId: number): boolean =>
      (data?.pendingRequests || []).some(r => r.courseId === courseId),
    
    getEnrollment: (courseId: number) =>
      (data?.enrollments || []).find(e => e.courseId === courseId),
    
    getCourse: (courseId: number) =>
      (data?.courses || []).find(c => c.id === courseId),
  };
}

