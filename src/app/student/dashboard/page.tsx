'use client';

import { useState, useEffect } from 'react';
import StatCard from '../../../components/student/StatCard';
import CourseCard from '../../../components/student/CourseCard';
import LoadingSpinner from '../../../components/student/LoadingSpinner';

// Calculate real progress from student progress data
function calculateRealProgress(courseId: string, enrolledCourses: any[]): number {
  const enrolledCourse = enrolledCourses.find((ec: any) => ec.courseId === courseId);
  if (enrolledCourse && enrolledCourse.progress !== undefined) {
    return enrolledCourse.progress;
  }
  return 0;
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    hoursLearned: 0,
    quizzesCompleted: 0,
    currentStreak: 0,
    totalPoints: 0,
  });
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrolledCoursesData, setEnrolledCoursesData] = useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isFetchingCourses, setIsFetchingCourses] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [pendingRequestCourseIds, setPendingRequestCourseIds] = useState<string[]>([]);

  // Fetch real user data
  useEffect(() => {
    const fetchUser = async () => {
      const storedUserData = sessionStorage.getItem('userData');
      let hasStoredData = false;

      if (storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          if (process.env.NODE_ENV === 'development') {
            console.log('📦 Using user data from sessionStorage:', parsedUser);
          }
          setUser(parsedUser);
          hasStoredData = true;
          setIsLoading(false);
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }

      // Removed artificial delay for better performance

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Fetching user data from /api/auth/me...');
        }
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          // Enable caching for better performance
          next: { revalidate: 60 },
          headers: { 'Content-Type': 'application/json' },
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('📡 Response status:', response.status);
        }

        if (response.ok) {
          const data = await response.json();
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ User data received from API:', data.user);
          }
          if (data.user) {
            setUser(data.user);
            setIsLoading(false);
            if (storedUserData) {
              sessionStorage.removeItem('userData');
            }
          } else {
            console.error('❌ No user data in API response');
            if (!hasStoredData) {
              setIsLoading(false);
              setTimeout(() => (window.location.href = '/login'), 2000);
            }
          }
        } else if (response.status === 401) {
          console.error('❌ Unauthorized (401)');
          if (hasStoredData) {
            setTimeout(async () => {
              try {
                const retryResponse = await fetch('/api/auth/me', {
                  credentials: 'include',
                  next: { revalidate: 60 },
                });
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.user) {
                    setUser(retryData.user);
                    sessionStorage.removeItem('userData');
                  }
                }
              } catch (e) {
                console.error('Retry failed:', e);
              }
            }, 3000);
          } else {
            setIsLoading(false);
            setTimeout(() => (window.location.href = '/login'), 2000);
          }
        } else {
          console.error('❌ Failed to fetch user - status:', response.status);
          if (!hasStoredData) {
            setIsLoading(false);
            setTimeout(() => (window.location.href = '/login'), 2000);
          }
        }
      } catch (error) {
        console.error('❌ Exception fetching user:', error);
        if (!hasStoredData) {
          setIsLoading(false);
          setTimeout(() => (window.location.href = '/login'), 2000);
        }
      }
    };
    fetchUser();
  }, []);

  // Fetch real courses from API
  useEffect(() => {
    if (!user?.id) return;
    // Allow both students and admins to view (admins can test student view)
    if (user.role !== 'student' && user.role !== 'admin') {
      setIsLoadingCourses(false);
      setCourses([]);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const fetchCourses = async () => {
      setIsFetchingCourses(true);
      try {
        setIsLoadingCourses(true);
        console.log('📚 Fetching courses from API...');
        const response = await fetch('/api/student/courses', {
          credentials: 'include',
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          console.log('📚 API Response - Full data:', data);
          console.log('📚 API Response - Courses count:', data.courses?.length || 0);

          if (data.courses && data.courses.length > 0) {
            console.log('📚 Courses received:', data.courses);
            setCourses(data.courses);
            console.log('✅ Courses SET in state:', data.courses.length, 'courses');
            console.log(
              '📚 Course details:',
              data.courses.map((c: any) => ({
                id: c.id,
                title: c.title,
                status: c.status,
                isEnrolled: c.isEnrolled,
              }))
            );
          } else {
            console.warn('⚠️ No courses returned from API');
            console.warn('⚠️ Response data:', JSON.stringify(data));
            setCourses([]);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Failed to fetch courses:', response.status, errorData);
          setCourses([]);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('❌ Error fetching courses:', error);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) {
          setIsLoadingCourses(false);
          setIsFetchingCourses(false);
        }
      }
    };

    fetchCourses();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]);

  // Fetch all dashboard data using unified endpoint for better performance
  useEffect(() => {
    if (!user?.id) return;
    // Allow both students and admins
    if (user.role !== 'student' && user.role !== 'admin') return;

    let isMounted = true;
    const abortController = new AbortController();

    const fetchDashboardData = async () => {
      if (!isMounted) return;

      setIsFetchingStats(true);
      setIsFetchingCourses(true);
      
      try {
        // Use unified endpoint - single request instead of 3+ separate requests
        const response = await fetch('/api/student/dashboard-data', {
          credentials: 'include',
          signal: abortController.signal,
          // Enable caching for better performance
          next: { revalidate: 30 },
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          
          // Set all data at once from unified response
          if (data.stats) {
            setStats(data.stats);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Stats fetched (UNIFIED):', data.stats);
            }
          }

          if (data.enrolledCourses) {
            // CRITICAL: Convert to string for consistent comparison
            const courseIds = data.enrolledCourses.map((ec: any) => String(ec.courseId));
            setEnrolledCourseIds(courseIds);
            setEnrolledCoursesData(data.enrolledCourses);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Enrolled courses fetched (UNIFIED):', courseIds);
            }
          }

          if (data.requests) {
            const pendingCourseIds = (data.requests || [])
              .filter((r: any) => r.status === 'pending')
              .map((r: any) => r.courseId.toString());
            setPendingRequestCourseIds(pendingCourseIds);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Pending requests fetched (UNIFIED):', pendingCourseIds);
            }
          }
        } else {
          console.error('❌ Failed to fetch dashboard data:', response.status);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (isMounted) {
          setIsFetchingStats(false);
          setIsFetchingCourses(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]);

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading your dashboard..." fullScreen />;
  }

  const studentData = {
    name: user.name,
    enrolledCourses: enrolledCourseIds,
    activeStatus: user.isActive,
  };

  const handleRequestAccess = (courseId: string) => {
    setSelectedCourse(courseId);
    setShowRequestModal(true);
  };

  const submitAccessRequest = async () => {
    if (!selectedCourse) return;

    try {
      const response = await fetch('/api/student/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: selectedCourse,
          reason: requestNote || 'Requesting access to this course',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Access request submitted successfully! You will be notified when it is reviewed.');
        setShowRequestModal(false);
        setRequestNote('');
        // Add to pending requests list
        if (selectedCourse) {
          setPendingRequestCourseIds((prev) => [...prev, selectedCourse]);
        }
        setSelectedCourse(null);
        // Refresh requests to get updated status
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
        }
      } else {
        alert(data.message || 'Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  // Filter courses - ONLY real data, no fake filtering
  // IMPORTANT: Courses with pending requests should NOT be shown as enrolled
  // Only show as enrolled if they have actual enrollment (studentProgress entry) AND no pending request
  // Accept both 'published' and 'active' status (admin UI shows "Active" but DB stores "published")
  const enrolledCourses = courses.filter((c) => {
    // CRITICAL: Ensure string comparison for consistency
    const courseIdStr = String(c.id);
    const isEnrolled = studentData.enrolledCourses.includes(courseIdStr);
    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr);
    // Case-insensitive status check to handle 'Active', 'active', 'Published', 'published'
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    const result = isEnrolled && !hasPendingRequest && isPublished;

    console.log(
      `📋 Course "${c.title}" (${courseIdStr}): enrolled=${isEnrolled}, pending=${hasPendingRequest}, status=${c.status}, published=${isPublished}, result=${result}`
    );

    return result;
  });

  // Show courses with pending requests separately (they should show "Requested" status)
  const requestedCourses = courses.filter((c) => {
    const courseIdStr = String(c.id);
    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr);
    const isEnrolled = studentData.enrolledCourses.includes(courseIdStr);
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    // Show as requested if has pending request AND not enrolled AND published/active
    // Approved requests without enrollment should also show here (sync may be in progress)
    return hasPendingRequest && !isEnrolled && isPublished;
  });

  const lockedCourses = courses.filter((c) => {
    const courseIdStr = String(c.id);
    const isEnrolled = studentData.enrolledCourses.includes(courseIdStr);
    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr);
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    // Show as locked if not enrolled AND no pending request AND published/active
    return !isEnrolled && !hasPendingRequest && isPublished;
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section - REAL DATA ONLY */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-10 text-white relative overflow-hidden border border-blue-400/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl -ml-40 -mb-40" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <svg
                    className="w-7 h-7 text-white"
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
                <div>
                  <p className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-1">
                    Student Portal
                  </p>
                  <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Welcome back, {user.name.split(' ')[0]}
                  </h1>
                  <p className="text-xl text-blue-100 font-medium">{user.name}</p>
                </div>
              </div>
              <p className="text-blue-200/90 text-base mt-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Ready to continue your learning journey today?
              </p>
            </div>
          </div>

          {/* Quick Stats - REAL DATA ONLY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">
                {stats.currentStreak}
              </div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                Day Streak 🔥
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">
                {stats.coursesEnrolled}
              </div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                Active Courses
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">
                {stats.hoursLearned.toFixed(1)}
              </div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                Hours Learned
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">
                {stats.totalPoints}
              </div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">
                Points Earned 🏆
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - REAL DATA ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
          label="Courses Enrolled"
          value={stats.coursesEnrolled}
          bgColor="bg-blue-100"
          textColor="text-blue-600"
        />

        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          label="Courses Completed"
          value={stats.coursesCompleted}
          bgColor="bg-green-100"
          textColor="text-green-600"
        />

        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          label="Hours Learned"
          value={stats.hoursLearned.toFixed(1)}
          bgColor="bg-purple-100"
          textColor="text-purple-600"
        />

        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          label="Quizzes Completed"
          value={stats.quizzesCompleted}
          bgColor="bg-orange-100"
          textColor="text-orange-600"
        />
      </div>

      {/* Continue Learning - REAL COURSES ONLY */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
          <a
            href="/student/courses"
            className="text-purple-600 hover:text-purple-700 font-semibold flex items-center space-x-1"
          >
            <span>View All</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {isLoadingCourses ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        ) : enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isLocked={false}
                userId={user?.id || 1}
                progress={calculateRealProgress(course.id, enrolledCoursesData)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No enrolled courses yet</h3>
            <p className="text-gray-600">Browse available courses below to get started</p>
          </div>
        )}
      </div>

      {/* Requested Courses - Show courses with pending requests */}
      {!isLoadingCourses && requestedCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Requested Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requestedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isLocked={!studentData.enrolledCourses.includes(course.id)}
                userId={user?.id || 1}
                hasPendingRequest={pendingRequestCourseIds.includes(course.id)}
                hasApprovedRequest={course.hasApprovedRequest || false}
                isPublic={course.isPublic || false}
                onRequestAccess={undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Explore More Courses - REAL COURSES ONLY */}
      {!isLoadingCourses && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore More Courses</h2>
          {lockedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lockedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isLocked={!course.isEnrolled}
                  userId={user?.id || 1}
                  hasPendingRequest={pendingRequestCourseIds.includes(course.id)}
                  hasApprovedRequest={course.hasApprovedRequest || false}
                  isPublic={course.isPublic || false}
                  onRequestAccess={() => {
                    // Refresh data after enrollment/request
                    window.location.reload();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses available</h3>
              <p className="text-gray-600">
                Check back later for new courses from your instructors
              </p>
            </div>
          )}
        </div>
      )}

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Course Access</h2>
            <p className="text-gray-600 mb-6">
              Send a request to the admin to unlock this course. You&apos;ll be notified once
              it&apos;s approved.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                placeholder="Why do you want to access this course?"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitAccessRequest}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestNote('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
