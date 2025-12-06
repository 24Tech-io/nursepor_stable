'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CourseCard from '@/components/student/CourseCard';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

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
  const enrolledCourse = enrolledCourses.find(
    (ec: any) => String(ec.courseId) === String(courseId)
  );
  if (enrolledCourse && enrolledCourse.progress !== undefined) {
    return enrolledCourse.progress;
  }
  return 0;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrolledCoursesData, setEnrolledCoursesData] = useState<any[]>([]);
  const [pendingRequestCourseIds, setPendingRequestCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'requested' | 'available'>('enrolled');

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me?type=student', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch courses, enrolled courses, and pending requests
  useEffect(() => {
    if (hasFetched) return; // Only fetch once

    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);

        // Fetch courses, enrolled courses with progress, and requests in parallel
        const [coursesResponse, enrolledResponse, requestsResponse] = await Promise.all([
          fetch('/api/student/courses', {
            credentials: 'include',
            signal: abortController.signal,
            cache: 'no-store',
          }),
          fetch('/api/student/enrolled-courses', {
            credentials: 'include',
            signal: abortController.signal,
            cache: 'no-store',
          }),
          fetch('/api/student/requests', {
            credentials: 'include',
            signal: abortController.signal,
            cache: 'no-store',
          }),
        ]);

        if (!isMounted) return;

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setCourses(coursesData.courses || []);

          // Extract enrolled course IDs
          const enrolledIds = (coursesData.courses || [])
            .filter((c: Course) => c.isEnrolled)
            .map((c: Course) => c.id);
          setEnrolledCourseIds(enrolledIds);
        } else {
          console.error('Failed to fetch courses:', coursesResponse.status);
        }

        if (enrolledResponse.ok) {
          const enrolledData = await enrolledResponse.json();
          setEnrolledCoursesData(enrolledData.enrolledCourses || []);
          console.log('✅ Enrolled courses with progress:', enrolledData.enrolledCourses);
        } else {
          console.error('Failed to fetch enrolled courses:', enrolledResponse.status);
        }

        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          const pendingCourseIds = (requestsData.requests || [])
            .filter((r: any) => r.status === 'pending')
            .map((r: any) => r.courseId.toString());
          setPendingRequestCourseIds(pendingCourseIds);
          console.log('✅ Pending requests fetched:', pendingCourseIds);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasFetched(true);
        }
      }
    };

    fetchData();

    // Start sync client for auto-updates with proper cleanup
    const handleSync = (syncData: any) => {
      if (isMounted) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [Courses Page] Sync update received:', syncData);
        }
        setHasFetched(false); // Allow refetch on sync
      }
    };

    syncClient.start();
    syncClient.on('sync', handleSync);

    return () => {
      isMounted = false;
      abortController.abort();
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter((c) =>
      [c.title, c.description, c.instructor].some((v) => v?.toLowerCase().includes(q))
    );
  }, [courses, query]);

  const enrolled = filtered.filter((c) => {
    const statusLower = c.status?.toLowerCase();
    return c.isEnrolled && (statusLower === 'published' || statusLower === 'active');
  });

  const requested = filtered.filter((c) => {
    const statusLower = c.status?.toLowerCase();
    return (
      pendingRequestCourseIds.includes(c.id) &&
      (statusLower === 'published' || statusLower === 'active')
    );
  });

  const locked = filtered.filter((c) => {
    const statusLower = c.status?.toLowerCase();
    return (
      !c.isEnrolled &&
      (statusLower === 'published' || statusLower === 'active') &&
      !pendingRequestCourseIds.includes(c.id)
    ); // Exclude courses with pending requests
  });

  function requestAccess(courseId: string) {
    setRequestingId(courseId);
  }

  async function submitRequest() {
    if (!requestingId) {
      return;
    }

    try {
      const response = await fetch('/api/student/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: requestingId,
          reason: note || 'Requesting access to this course',
        }),
      });

      if (response.ok) {
        alert('Access request submitted successfully! You will be notified when it is reviewed.');
        setRequestingId(null);
        setNote('');
        // Refresh pending requests
        const requestsResponse = await fetch('/api/student/requests', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          const pendingCourseIds = (requestsData.requests || [])
            .filter((r: any) => r.status === 'pending')
            .map((r: any) => r.courseId.toString());
          setPendingRequestCourseIds(pendingCourseIds);
          // Switch to requested tab to show the newly requested course
          setActiveTab('requested');
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request');
    }
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading your courses..." fullScreen />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-2 text-gray-600">Continue where you left off, or explore more.</p>
        </div>
        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'enrolled'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Enrolled
            {enrolled.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-purple-100 text-purple-600">
                {enrolled.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requested')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'requested'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Requested
            {requested.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-orange-100 text-orange-600">
                {requested.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('available')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'available'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Available
            {locked.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled Courses</h2>
            {enrolled.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolled.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      ...c,
                      modules: c.modules || [],
                      status: c.status as 'draft' | 'published',
                    }}
                    isLocked={false}
                    progress={calculateRealProgress(c.id, enrolledCoursesData)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No enrolled courses yet
                </h3>
                <p className="text-gray-600">Check out the available courses to get started!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requested' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Requested Courses</h2>
            {requested.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requested.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      ...c,
                      modules: c.modules || [],
                      status: c.status as 'draft' | 'published',
                    }}
                    isLocked={true}
                    userId={user?.id || undefined}
                    hasPendingRequest={true}
                    hasApprovedRequest={c.hasApprovedRequest || false}
                    isPublic={c.isPublic || false}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600">Request access to courses from the Available tab</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'available' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Courses</h2>
            {locked.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locked.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      ...c,
                      modules: c.modules || [],
                      status: c.status as 'draft' | 'published',
                    }}
                    isLocked={!c.isEnrolled}
                    userId={user?.id || undefined}
                    hasPendingRequest={pendingRequestCourseIds.includes(c.id)}
                    hasApprovedRequest={c.hasApprovedRequest || false}
                    isPublic={c.isPublic || false}
                    onRequestAccess={async () => {
                      // Refresh data after enrollment/request - refetch courses instead of full reload
                      try {
                        const response = await fetch('/api/student/courses', {
                          credentials: 'include',
                        });
                        if (response.ok) {
                          const data = await response.json();
                          setCourses(data.courses || []);
                        }
                      } catch (error) {
                        console.error('Error refreshing courses:', error);
                        // Fallback to router refresh if fetch fails
                        router.refresh();
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No more courses available at the moment</p>
              </div>
            )}
          </div>
        )}
      </div>

      {requestingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Access</h3>
            <p className="text-gray-600 mb-4">Optionally add a note for the admin.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="I'd like to join this course because..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRequestingId(null);
                  setNote('');
                }}
                className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700"
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
