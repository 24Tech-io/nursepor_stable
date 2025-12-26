'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CourseCard from '@/components/student/CourseCard';
import { CourseCardSkeleton } from '@/components/student/SkeletonLoader';
import { syncClient } from '@/lib/sync-client';
import { invalidateCache } from '@/lib/data-cache';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string | null;
  pricing: number;
  status: string;
  isRequestable: boolean;
  isPublic?: boolean;
  isEnrolled: boolean;
  hasPendingRequest?: boolean;
  hasApprovedRequest?: boolean;
  modules?: any[];
};

// Calculate real progress from enrolled courses data
function calculateRealProgress(courseId: string, enrolledCourses: any[]): number {
  const enrolledCourse = enrolledCourses.find((ec: any) => String(ec.courseId) === String(courseId));
  if (enrolledCourse && enrolledCourse.progress !== undefined) {
    return enrolledCourse.progress;
  }
  return 0;
}

export default function CoursesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'requested' | 'available'>('enrolled');
  const lastSyncInvalidateAtRef = useRef(0);

  // ⚡ PERFORMANCE: Fetch user data with React Query
  const { data: user } = useQuery({
    queryKey: ['student-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      return data.user;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem('student_auth_cache');
          return cached ? JSON.parse(cached).user : undefined;
        } catch { return undefined; }
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // ⚡ PERFORMANCE: Fetch all course data with React Query (cached 30 seconds)
  const { data: courseData, isLoading } = useQuery({
    queryKey: ['student-courses-data'],
    queryFn: async () => {
      console.log('⚡ Fetching student courses data...');
      const [coursesRes, enrolledRes, requestsRes] = await Promise.all([
        fetch('/api/student/courses', { credentials: 'include' }),
        fetch('/api/student/enrolled-courses', { credentials: 'include' }),
        fetch('/api/student/requests', { credentials: 'include' }),
      ]);

      const coursesData = coursesRes.ok ? await coursesRes.json() : { courses: [] };
      const enrolledData = enrolledRes.ok ? await enrolledRes.json() : { enrolledCourses: [] };
      const requestsData = requestsRes.ok ? await requestsRes.json() : { requests: [] };

      const courses = coursesData.courses || [];
      const enrolledCourseIds = courses.filter((c: Course) => c.isEnrolled).map((c: Course) => c.id);
      const enrolledCoursesData = enrolledData.enrolledCourses || [];
      const pendingRequestCourseIds = (requestsData.requests || [])
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => r.courseId.toString());

      console.log('⚡ Student courses data loaded and cached');
      return { courses, enrolledCourseIds, enrolledCoursesData, pendingRequestCourseIds };
    },
    staleTime: 30 * 1000, // 30 seconds - fast navigation back
  });

  // Destructure with defaults
  const courses = courseData?.courses || [];
  const enrolledCourseIds = courseData?.enrolledCourseIds || [];
  const enrolledCoursesData = courseData?.enrolledCoursesData || [];
  const pendingRequestCourseIds = courseData?.pendingRequestCourseIds || [];

  // Refresh function for cache invalidation
  const refreshData = () => {
    invalidateCache('student-courses');
    invalidateCache('student-enrolled-courses');
    invalidateCache('student-requests');
    queryClient.invalidateQueries({ queryKey: ['student-courses-data'] });
  };

  // Sync client listener
  useEffect(() => {
    const handleSync = (syncData: any) => {
      const now = Date.now();
      if (now - lastSyncInvalidateAtRef.current < 8000) return;
      lastSyncInvalidateAtRef.current = now;
      console.log('🔄 [Courses Page] Sync update received:', syncData);
      refreshData();
    };

    // TEMP DISABLED: Causing excessive requests`r`n

    // syncClient.start();
    syncClient.on('sync', handleSync);
    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, []);


  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(c => {
      // Exclude quiz courses - only show Q-Banks and regular courses
      const titleLower = (c.title || '').toLowerCase();
      const isQuiz = titleLower.includes('quiz') && !titleLower.includes('q-bank') && !titleLower.includes('qbank');
      if (isQuiz) {
        return false;
      }
      return [c.title, c.description, c.instructor].some(v => v?.toLowerCase().includes(q));
    });
  }, [courses, query]);

  const enrolled = filtered.filter(c => {
    const statusLower = c.status?.toLowerCase();
    return c.isEnrolled && (statusLower === 'published' || statusLower === 'active');
  });

  const requested = filtered.filter(c => {
    const statusLower = c.status?.toLowerCase();
    return pendingRequestCourseIds.includes(c.id) && (statusLower === 'published' || statusLower === 'active');
  });

  const locked = filtered.filter(c => {
    const statusLower = c.status?.toLowerCase();
    return !c.isEnrolled &&
      (statusLower === 'published' || statusLower === 'active') &&
      !pendingRequestCourseIds.includes(c.id);
  });

  function requestAccess(courseId: string) {
    setRequestingId(courseId);
  }

  async function submitRequest() {
    if (!requestingId) return;

    const courseId = requestingId;
    const requestNote = note;

    // Close modal immediately (optimistic UI response)
    setRequestingId(null);
    setNote('');
    setActiveTab('requested');

    try {
      const response = await fetch('/api/student/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId,
          reason: requestNote || 'Requesting access to this course',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to submit request');
        return;
      }

      // ⚡ Invalidate cache to refresh course data
      invalidateCache('student-requests');
      queryClient.invalidateQueries({ queryKey: ['student-courses-data'] });
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(error.message || 'Failed to submit request');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Courses</h1>
            <p className="mt-2 text-nurse-silver-400">Continue where you left off, or explore more.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Courses</h1>
          <p className="mt-2 text-nurse-silver-400">Continue where you left off, or explore more.</p>
        </div>
        <div className="w-full md:max-w-md">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search courses"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500 backdrop-blur-xl"
          />
        </div>
      </div>

      {/* Tab Navigation - Dark Theme */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'enrolled'
                ? 'border-nurse-red-500 text-nurse-red-400'
                : 'border-transparent text-nurse-silver-400 hover:text-white hover:border-white/30'
              }
            `}
          >
            Enrolled
            {enrolled.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-nurse-red-500/20 text-nurse-red-400 border border-nurse-red-500/30">
                {enrolled.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requested')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'requested'
                ? 'border-nurse-red-500 text-nurse-red-400'
                : 'border-transparent text-nurse-silver-400 hover:text-white hover:border-white/30'
              }
            `}
          >
            Requested
            {requested.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {requested.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('available')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'available'
                ? 'border-nurse-red-500 text-nurse-red-400'
                : 'border-transparent text-nurse-silver-400 hover:text-white hover:border-white/30'
              }
            `}
          >
            Available
            {locked.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-white/10 text-nurse-silver-300 border border-white/20">
                {locked.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'enrolled' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Enrolled Courses</h2>
            {enrolled.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolled.map(c => {
                  // Prefetch course detail page
                  router.prefetch(`/student/courses/${c.id}`);
                  return (
                    <CourseCard
                      key={c.id}
                      course={{ ...c, modules: c.modules || [], status: c.status as 'draft' | 'published' }}
                      isLocked={false}
                      progress={calculateRealProgress(c.id, enrolledCoursesData)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <div className="w-20 h-20 bg-nurse-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-red-500/20">
                  <svg className="w-10 h-10 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No enrolled courses yet</h3>
                <p className="text-nurse-silver-400">Check out the available courses to get started!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requested' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Requested Courses</h2>
            {requested.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requested.map(c => (
                  <CourseCard
                    key={c.id}
                    course={{ ...c, modules: c.modules || [], status: c.status as 'draft' | 'published' }}
                    isLocked={true}
                    userId={user?.id || undefined}
                    hasPendingRequest={true}
                    hasApprovedRequest={c.hasApprovedRequest || false}
                    isPublic={c.isPublic || false}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                  <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No pending requests</h3>
                <p className="text-nurse-silver-400">Request access to courses from the Available tab</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'available' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Available Courses</h2>
            {locked.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locked.map(c => (
                  <CourseCard
                    key={c.id}
                    course={{ ...c, modules: c.modules || [], status: c.status as 'draft' | 'published' }}
                    isLocked={!c.isEnrolled}
                    userId={user?.id || undefined}
                    hasPendingRequest={pendingRequestCourseIds.includes(c.id)}
                    hasApprovedRequest={c.hasApprovedRequest || false}
                    isPublic={c.isPublic || false}
                    onRequestAccess={refreshData}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">All caught up!</h3>
                <p className="text-nurse-silver-400">No more courses available at the moment</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Modal - Dark Theme */}
      {requestingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-dark-xl border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-2">Request Access</h3>
            <p className="text-nurse-silver-400 mb-4">Optionally add a note for the admin.</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
              placeholder="I'd like to join this course because..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRequestingId(null); setNote(''); }}
                className="px-5 py-3 bg-white/10 text-nurse-silver-300 rounded-xl font-semibold hover:bg-white/20 transition border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                className="px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white rounded-xl font-semibold hover:from-nurse-red-700 hover:to-red-700 shadow-glow-red transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
