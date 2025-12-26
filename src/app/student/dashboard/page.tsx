'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatCard from '../../../components/student/StatCard';
import CourseCard from '../../../components/student/CourseCard';
import { CourseCardSkeleton } from '../../../components/student/SkeletonLoader';
import { cachedFetch, invalidateCache, DEFAULT_TTL } from '@/lib/data-cache';

// Calculate real progress from student progress data
function calculateRealProgress(courseId: string, enrolledCourses: any[]): number {
  const enrolledCourse = enrolledCourses.find((ec: any) => ec.courseId === courseId);
  if (enrolledCourse && enrolledCourse.progress !== undefined) {
    return enrolledCourse.progress;
  }
  return 0;
}

export default function StudentDashboard() {
  const router = useRouter();
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
  const [qbanks, setQbanks] = useState<{
    enrolled: any[];
    requested: any[];
    available: any[];
  }>({
    enrolled: [],
    requested: [],
    available: [],
  });
  const [isLoadingQBanks, setIsLoadingQBanks] = useState(false);

  // Fetch Q-Banks
  useEffect(() => {
    if (!user?.id) return;

    const fetchQBanks = async () => {
      setIsLoadingQBanks(true);
      try {
        const response = await fetch('/api/student/qbanks', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setQbanks({
            enrolled: data.enrolled || [],
            requested: data.requested || [],
            available: data.available || [],
          });
        }
      } catch (error) {
        console.error('Error fetching Q-Banks:', error);
      } finally {
        setIsLoadingQBanks(false);
      }
    };

    fetchQBanks();
  }, [user?.id]);

  // Initialize user from cache (Layout guarantees auth)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('student_auth_cache');
      if (cached) {
        const userData = JSON.parse(cached).user;
        setUser(userData);
        setIsLoading(false);
      } else {
        // Fallback if cache missing (shouldn't happen due to Layout)
        fetch('/api/auth/me?type=student')
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setUser(data.user);
              setIsLoading(false);
            } else {
              router.replace('/login');
            }
          })
          .catch(() => router.replace('/login'));
      }
    } catch (e) {
      console.error('Error reading auth cache:', e);
      setIsLoading(false);
    }
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

        const data = await cachedFetch<{ courses: any[] }>('/api/student/courses', {
          credentials: 'include',
          cacheKey: 'student-courses',
          ttl: DEFAULT_TTL.courses,
        });

        if (!isMounted) return;

        console.log('📚 API Response - Full data:', data);
        console.log('📚 API Response - Courses count:', data.courses?.length || 0);

        if (data.courses && data.courses.length > 0) {
          console.log('📚 Courses received:', data.courses.length, 'courses');
          // Log each course's details for debugging
          data.courses.forEach((c: any) => {
            console.log(`  📖 "${c.title}" - ID: ${c.id}, Status: ${c.status}, Enrolled: ${c.isEnrolled}, Public: ${c.isPublic}, Requestable: ${c.isRequestable}`);
          });
          setCourses(data.courses);
          console.log('✅ Courses SET in state:', data.courses.length, 'courses');
        } else {
          console.warn('⚠️ No courses returned from API');
          setCourses([]);
        }
      } catch (error: any) {
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
        const [statsData, coursesData, requestsData] = await Promise.all([
          cachedFetch<{ stats: any }>('/api/student/stats', {
            credentials: 'include',
            cacheKey: 'student-stats',
            ttl: DEFAULT_TTL.stats,
          }),
          cachedFetch<{ enrolledCourses: any[] }>('/api/student/enrolled-courses', {
            credentials: 'include',
            cacheKey: 'student-enrolled-courses',
            ttl: DEFAULT_TTL.progress,
          }),
          cachedFetch<{ requests: any[] }>('/api/student/requests', {
            credentials: 'include',
            cacheKey: 'student-requests',
            ttl: DEFAULT_TTL.requests,
          }),
        ]);

        if (!isMounted) return;

        if (statsData.stats) {
          setStats(statsData.stats);
          console.log('✅ Stats fetched (REAL DATA):', statsData.stats);
        }

        if (coursesData.enrolledCourses) {
          // CRITICAL: Convert to string for consistent comparison
          const courseIds = coursesData.enrolledCourses.map((ec: any) => String(ec.courseId));
          setEnrolledCourseIds(courseIds);
          setEnrolledCoursesData(coursesData.enrolledCourses);
          console.log('✅ Enrolled courses fetched (REAL DATA):', courseIds);
          console.log('✅ Enrolled course data:', coursesData.enrolledCourses);
        }

        if (requestsData.requests) {
          const pendingCourseIds = (requestsData.requests || [])
            .filter((r: any) => r.status === 'pending')
            .map((r: any) => r.courseId.toString());
          setPendingRequestCourseIds(pendingCourseIds);
          console.log('✅ Pending requests fetched:', pendingCourseIds);
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

    fetchStats();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]);

  if (isLoading || !user) {
    return (
      <div className="space-y-8">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 animate-pulse">
          <div className="absolute inset-0 bg-slate-900" />
          <div className="relative z-10 p-10">
            <div className="h-12 w-64 bg-slate-700/50 rounded mb-4" />
            <div className="h-6 w-96 bg-slate-700/50 rounded mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-700/50 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
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
  // Exclude quiz courses - only show Q-Banks and regular courses
  const enrolledCourses = courses.filter(c => {
    const courseIdStr = String(c.id);
    const titleLower = (c.title || '').toLowerCase();
    const isQuiz = titleLower.includes('quiz') && !titleLower.includes('q-bank') && !titleLower.includes('qbank');
    if (isQuiz) {
      return false; // Exclude quiz courses
    }

    const isEnrolled = studentData.enrolledCourses.includes(courseIdStr);
    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr);
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    const result = isEnrolled && !hasPendingRequest && isPublished;

    console.log(`📋 Course "${c.title}" (${courseIdStr}): enrolled=${isEnrolled}, pending=${hasPendingRequest}, status=${c.status}, published=${isPublished}, result=${result}`);

    return result;
  });

  const requestedCourses = courses.filter(c => {
    const courseIdStr = String(c.id);
    const titleLower = (c.title || '').toLowerCase();
    const isQuiz = titleLower.includes('quiz') && !titleLower.includes('q-bank') && !titleLower.includes('qbank');
    if (isQuiz) {
      return false; // Exclude quiz courses
    }

    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr);
    const isEnrolled = studentData.enrolledCourses.includes(courseIdStr);
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    return hasPendingRequest && !isEnrolled && isPublished;
  });

  const lockedCourses = courses.filter((c) => {
    const courseIdStr = String(c.id);
    const titleLower = (c.title || '').toLowerCase();
    const isQuiz = titleLower.includes('quiz') && !titleLower.includes('q-bank') && !titleLower.includes('qbank');
    if (isQuiz) {
      return false; // Exclude quiz courses
    }

    // Use isEnrolled from API response (more reliable) OR check enrolledCourseIds
    const isEnrolled = c.isEnrolled || studentData.enrolledCourses.includes(courseIdStr);
    const hasPendingRequest = pendingRequestCourseIds.includes(courseIdStr) || c.hasPendingRequest;
    const statusLower = c.status?.toLowerCase();
    const isPublished = statusLower === 'published' || statusLower === 'active';
    const result = !isEnrolled && !hasPendingRequest && isPublished;

    console.log(`🔒 Course "${c.title}" (${courseIdStr}): isEnrolled=${isEnrolled}, hasPendingRequest=${hasPendingRequest}, status=${c.status}, published=${isPublished}, result=${result}`);

    return result;
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section - Dark Elegance with Red Spotlight */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10">
        {/* Dark Background with Red Spotlight Effect */}
        <div className="absolute inset-0 bg-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(227,28,37,0.15),_transparent_70%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-nurse-red-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-nurse-red-500/5 rounded-full blur-3xl -ml-40 -mb-40" />

        <div className="relative z-10 p-10">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-nurse-red-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-nurse-red-500/30 shadow-glow-red">
                  <svg className="w-7 h-7 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-nurse-red-400 uppercase tracking-wider mb-1">Student Portal</p>
                  <h1 className="text-5xl font-extrabold mb-2 text-white">
                    Welcome back, <span className="text-gradient">{user.name.split(' ')[0]}</span>
                  </h1>
                  <p className="text-xl text-nurse-silver-300 font-medium">{user.name}</p>
                </div>
              </div>
              <p className="text-nurse-silver-400 text-base mt-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Ready to continue your learning journey today?
              </p>
            </div>
          </div>

          {/* Quick Stats - Dark Glass */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.currentStreak}</div>
              <div className="text-sm text-nurse-silver-400 font-semibold mt-1">Day Streak 🔥</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.coursesEnrolled}</div>
              <div className="text-sm text-nurse-silver-400 font-semibold mt-1">Active Courses</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.hoursLearned.toFixed(1)}</div>
              <div className="text-sm text-nurse-silver-400 font-semibold mt-1">Hours Learned</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.quizzesCompleted}</div>
              <div className="text-sm text-nurse-silver-400 font-semibold mt-1">Quizzes Done ✅</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Dark Glass Theme */}
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
          bgColor="bg-nurse-red-500/20"
          textColor="text-nurse-red-400"
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
          bgColor="bg-green-500/20"
          textColor="text-green-400"
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
          bgColor="bg-nurse-silver-500/20"
          textColor="text-nurse-silver-300"
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
          bgColor="bg-amber-500/20"
          textColor="text-amber-400"
        />
      </div>

      {/* Continue Learning - Dark Theme */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Continue Learning</h2>
          <a href="/student/courses" className="text-nurse-red-400 hover:text-nurse-red-300 font-semibold flex items-center space-x-1 transition">
            <span>View All</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {isLoadingCourses ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500 mx-auto mb-4"></div>
            <p className="text-nurse-silver-400">Loading courses...</p>
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
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
            <div className="w-20 h-20 bg-nurse-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-red-500/20">
              <svg className="w-10 h-10 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No enrolled courses yet</h3>
            <p className="text-nurse-silver-400">Browse available courses below to get started</p>
          </div>
        )}
      </div>

      {/* Requested Courses - Dark Theme */}
      {!isLoadingCourses && requestedCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Requested Courses</h2>
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

      {/* Explore More Courses - Dark Theme */}
      {!isLoadingCourses && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Explore More Courses</h2>
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
                    // Refresh requests data
                    invalidateCache('student-requests');
                    const refreshRequests = async () => {
                      try {
                        const requestsData = await cachedFetch<{ requests: any[] }>('/api/student/requests', {
                          credentials: 'include',
                          cacheKey: 'student-requests',
                          ttl: DEFAULT_TTL.requests,
                        });
                        const pendingCourseIds = (requestsData.requests || [])
                          .filter((r: any) => r.status === 'pending')
                          .map((r: any) => r.courseId.toString());
                        setPendingRequestCourseIds(pendingCourseIds);
                      } catch (error) {
                        console.error('Error refreshing requests:', error);
                      }
                    };
                    refreshRequests();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
              <div className="w-20 h-20 bg-nurse-silver-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-silver-500/20">
                <svg className="w-10 h-10 text-nurse-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No courses available</h3>
              <p className="text-nurse-silver-400">Check back later for new courses from your instructors</p>
            </div>
          )}
        </div>
      )}

      {/* Q-Banks Section - Dark Theme */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Question Banks</h2>
          <Link
            href="/student/qbanks"
            className="text-purple-400 hover:text-purple-300 text-sm font-semibold flex items-center gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isLoadingQBanks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 animate-pulse">
                <div className="h-32 bg-slate-700/50 rounded-lg mb-4"></div>
                <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enrolled Q-Banks */}
            {qbanks.enrolled.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Enrolled Q-Banks ({qbanks.enrolled.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {qbanks.enrolled.slice(0, 3).map((qbank: any) => (
                    <div
                      key={qbank.id}
                      className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all"
                    >
                      {qbank.thumbnail && (
                        <div className="w-full h-32 bg-slate-800 rounded-lg mb-4 overflow-hidden">
                          <img src={qbank.thumbnail} alt={qbank.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-2">{qbank.name}</h4>
                      {qbank.description && (
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{qbank.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                        <span>{qbank.totalQuestions || 0} questions</span>
                        {qbank.enrollment?.progress !== undefined && (
                          <span className="text-purple-400 font-semibold">{qbank.enrollment.progress}%</span>
                        )}
                      </div>
                      <Link
                        href={`/student/qbanks/${qbank.id}`}
                        className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors"
                      >
                        Continue
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requested Q-Banks */}
            {qbanks.requested.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Requested Q-Banks ({qbanks.requested.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {qbanks.requested.slice(0, 3).map((qbank: any) => (
                    <div
                      key={qbank.id}
                      className="bg-white/5 backdrop-blur-xl rounded-xl border border-amber-500/30 p-6"
                    >
                      {qbank.thumbnail && (
                        <div className="w-full h-32 bg-slate-800 rounded-lg mb-4 overflow-hidden">
                          <img src={qbank.thumbnail} alt={qbank.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-2">{qbank.name}</h4>
                      {qbank.description && (
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{qbank.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                        <span>{qbank.totalQuestions || 0} questions</span>
                      </div>
                      <button
                        disabled
                        className="w-full bg-amber-600/50 text-amber-300 text-center py-2 px-4 rounded-lg font-semibold cursor-not-allowed border border-amber-500/30"
                      >
                        Request Pending
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Q-Banks */}
            {qbanks.available.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Available Q-Banks ({qbanks.available.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {qbanks.available.slice(0, 3).map((qbank: any) => (
                    <div
                      key={qbank.id}
                      className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:border-green-500/30 transition-all"
                    >
                      {qbank.thumbnail && (
                        <div className="w-full h-32 bg-slate-800 rounded-lg mb-4 overflow-hidden">
                          <img src={qbank.thumbnail} alt={qbank.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-2">{qbank.name}</h4>
                      {qbank.description && (
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{qbank.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                        <span>{qbank.totalQuestions || 0} questions</span>
                      </div>
                      <Link
                        href={`/student/qbanks/${qbank.id}${qbank.isRequestable && !qbank.isPublic ? '?request=true' : ''}`}
                        className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-2 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors"
                      >
                        {qbank.isPublic || qbank.isDefaultUnlocked ? 'Enroll Now' : 'Request Access'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Q-Banks Message */}
            {qbanks.enrolled.length === 0 && qbanks.requested.length === 0 && qbanks.available.length === 0 && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Q-Banks available</h3>
                <p className="text-nurse-silver-400">Check back later for new question banks</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Access Modal - Dark Theme */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-dark-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">Request Course Access</h2>
            <p className="text-nurse-silver-400 mb-6">
              Send a request to the admin to unlock this course. You&apos;ll be notified once it&apos;s approved.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-nurse-silver-300 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500"
                rows={4}
                placeholder="Why do you want to access this course?"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitAccessRequest}
                className="flex-1 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white py-3 rounded-xl font-semibold hover:from-nurse-red-700 hover:to-red-700 transition shadow-glow-red"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestNote('');
                }}
                className="flex-1 bg-white/10 text-nurse-silver-300 py-3 rounded-xl font-semibold hover:bg-white/20 transition border border-white/10"
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
