'use client';

import { useState, useEffect } from 'react';
import StatCard from '../../../components/student/StatCard';
import CourseCard from '../../../components/student/CourseCard';
import DailyVideoWidget from '../../../components/student/DailyVideoWidget';
import ContinueLearningWidget from '../../../components/student/ContinueLearningWidget';
// Removed getCourses import - only using real database courses

// Deterministic function to generate consistent values based on course ID
function getDeterministicProgress(courseId: string): number {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    const char = courseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 70 + 10; // Returns value between 10-80
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
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const refreshAuthToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        console.log('🔄 Token refreshed successfully');
        return true;
      }
      console.warn('Refresh token request failed with status:', response.status);
      return false;
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      return false;
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}, retry = true) => {
    const mergedOptions: RequestInit = {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        ...(options.headers || {}),
      },
      ...options,
    };

    let response = await fetch(url, mergedOptions);
    if (response.status === 401 && retry) {
      console.warn('Received 401 from', url, '- attempting token refresh');
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        response = await fetch(url, mergedOptions);
      }
    }
    return response;
  };

  // Fetch real user data - CRITICAL: Must fetch before showing dashboard
  useEffect(() => {
    const fetchUser = async () => {
      // First, try to get user data from sessionStorage (set during login)
      const storedUserData = sessionStorage.getItem('userData');
      let hasStoredData = false;
      if (storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          console.log('📦 Using user data from sessionStorage:', parsedUser);
          setUser(parsedUser);
          hasStoredData = true;
          setIsLoading(false); // Show dashboard immediately with stored data
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }

      // Wait a bit for cookie to be available, then fetch from API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay

      try {
        console.log('🔍 Fetching user data from /api/auth/me...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store', // Ensure fresh data
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('📡 Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ User data received from API:', data.user);
          if (data.user) {
            // Update with fresh data from API
            setUser(data.user);
            setIsLoading(false);
            // Clear sessionStorage only after successful API fetch
            if (storedUserData) {
              sessionStorage.removeItem('userData');
            }
          } else {
            console.error('❌ No user data in API response');
            // If we already have user data displayed, don't redirect
            if (!hasStoredData) {
              setIsLoading(false);
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            }
            return;
          }
        } else if (response.status === 401) {
          console.error('❌ Unauthorized (401) - cookie might not be set yet');
          // If we already have user data displayed, don't redirect - just retry
          if (hasStoredData) {
            console.log('⚠️ Using stored user data while cookie is being set - will retry');
            // Retry fetching after a longer delay
            setTimeout(async () => {
              try {
                console.log('🔄 Retrying /api/auth/me...');
                const retryResponse = await fetch('/api/auth/me', {
                  credentials: 'include',
                  cache: 'no-store'
                });
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.user) {
                    console.log('✅ Retry successful - updating user data');
                    setUser(retryData.user);
                    sessionStorage.removeItem('userData');
                  }
                } else {
                  console.error('❌ Retry still failed - status:', retryResponse.status);
                }
              } catch (e) {
                console.error('Retry failed:', e);
              }
            }, 3000); // Longer retry delay
          } else {
            // No stored data and API failed - redirect
            setIsLoading(false);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          return;
        } else {
          console.error('❌ Failed to fetch user - status:', response.status);
          // If we already have user data displayed, don't redirect
          if (!hasStoredData) {
            setIsLoading(false);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          return;
        }
      } catch (error) {
        console.error('❌ Exception fetching user:', error);
        // If we already have user data displayed, don't redirect
        if (!hasStoredData) {
          setIsLoading(false);
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        return;
      }
    };
    fetchUser();
  }, []);

  // Fetch real courses from API when user is authenticated
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || user.role !== 'student') {
        setIsLoadingCourses(false);
        setCourses([]); // Fallback to empty array
        return;
      }

      try {
        setIsLoadingCourses(true);

        // First, ensure Nurse Pro course exists (this will create it if it doesn't)
        try {
          const ensureResponse = await fetch('/api/qbank/ensure-course', {
            method: 'POST',
            credentials: 'include'
          });
          if (!ensureResponse.ok) {
            // Try the fix endpoint as fallback
            await fetch('/api/fix/nurse-pro-course', {
              method: 'POST',
              credentials: 'include'
            });
          }
        } catch (e) {
          // Silently fail - course might already exist or user might not be admin
          console.log('Note: Could not auto-create Nurse Pro course, trying fix endpoint...');
          try {
            await fetch('/api/fix/nurse-pro-course', {
              method: 'POST',
              credentials: 'include'
            });
          } catch (e2) {
            console.log('Note: Could not fix Nurse Pro course (this is normal for non-admin users)');
          }
        }

        const response = await fetchWithAuth('/api/student/courses');

        if (response.ok) {
          const data = await response.json();
          console.log('📚 Courses fetched:', data.courses?.length || 0, 'courses');
          console.log('📚 Course titles:', data.courses?.map((c: any) => c.title) || []);
          setCourses(data.courses || []);
          setCoursesError(null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to fetch courses:', response.status, errorData);

          // If 401, try to refresh token or redirect to login
          if (response.status === 401) {
            console.error('❌ Authentication failed. Token may be expired.');
            setCourses([]);
            setCoursesError('Your session expired. Please log in again.');
          } else {
            // Only show real database courses, no fallback to demo data
            setCourses([]);
            setCoursesError('Unable to reach the course API. Please try again later.');
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setCourses([]); // Only show real database courses
        setCoursesError('Unable to reach the course API. Please try again later.');
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [user]);

  // Fetch stats and enrolled courses
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const [statsResponse, coursesResponse] = await Promise.all([
          fetchWithAuth('/api/student/stats'),
          fetchWithAuth('/api/student/enrolled-courses'),
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
          console.log('✅ Stats fetched:', statsData.stats);
        } else if (statsResponse.status === 401) {
          console.warn('Stats API returned 401 after refresh attempt');
        } else {
          console.warn('Stats API responded with status:', statsResponse.status);
        }

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          const courseIds = coursesData.enrolledCourses.map((ec: any) => ec.courseId);
          setEnrolledCourseIds(courseIds);
          console.log('✅ Enrolled courses fetched:', courseIds);
        } else if (coursesResponse.status === 401) {
          console.warn('Enrolled courses API returned 401 after refresh attempt');
        } else {
          console.warn('Enrolled courses API responded with status:', coursesResponse.status);
        }
      } catch (error) {
        console.error('Error fetching stats/courses:', error);
      }
    };

    fetchStats();
  }, [user]);

  // Don't render dashboard content until user data is loaded
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Use REAL user data - user is guaranteed to be loaded at this point
  const studentData = {
    name: user.name, // Real user name from database
    enrolledCourses: enrolledCourseIds, // Real enrolled courses from API
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

      if (response.ok) {
        alert('Access request submitted successfully! You will be notified when it is reviewed.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    }

    setShowRequestModal(false);
    setRequestNote('');
    setSelectedCourse(null);
  };

  // Convert enrolled course IDs to strings for comparison
  const enrolledCourseIdsStr = studentData.enrolledCourses.map(id => id.toString());

  const enrolledCourses = courses.filter(c =>
    enrolledCourseIdsStr.includes(c.id.toString()) && c.status === 'published'
  );

  const lockedCourses = courses.filter(c =>
    !enrolledCourseIdsStr.includes(c.id.toString()) && c.status === 'published'
  );

  // Debug logging
  console.log('🔍 Dashboard Debug:', {
    totalCourses: courses.length,
    courseTitles: courses.map(c => c.title),
    courseIds: courses.map(c => c.id),
    enrolledCourseIds: studentData.enrolledCourses,
    enrolledCourseIdsStr: enrolledCourseIdsStr,
    enrolledCoursesCount: enrolledCourses.length,
    enrolledCourseTitles: enrolledCourses.map(c => c.title),
    lockedCoursesCount: lockedCourses.length,
    lockedCourseTitles: lockedCourses.map(c => c.title),
    lockedCourseIds: lockedCourses.map(c => c.id),
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section with Role Switcher */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl p-10 text-white relative overflow-hidden border border-blue-400/20">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl -ml-40 -mb-40" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-1">Student Portal</p>
                  <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Welcome back, Student
                  </h1>
                  <p className="text-xl text-blue-100 font-medium">{user.name}</p>
                </div>
              </div>
              <p className="text-blue-200/90 text-base mt-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Ready to continue your learning journey today?
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.currentStreak}</div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">Day Streak 🔥</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.coursesEnrolled}</div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">Active Courses</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.hoursLearned.toFixed(1)}</div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">Hours Learned</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-white drop-shadow-lg">{stats.totalPoints}</div>
              <div className="text-sm text-white font-semibold drop-shadow-md mt-1">Points Earned 🏆</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          label="Courses Enrolled"
          value={stats.coursesEnrolled}
          bgColor="bg-blue-100"
          textColor="text-blue-600"
          trend={{ value: '+1 this month', isPositive: true }}
        />

        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Hours Learned"
          value={stats.hoursLearned.toFixed(1)}
          bgColor="bg-purple-100"
          textColor="text-purple-600"
          trend={{ value: '+2.5 hrs this week', isPositive: true }}
        />

        <StatCard
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          label="Quizzes Completed"
          value={stats.quizzesCompleted}
          bgColor="bg-orange-100"
          textColor="text-orange-600"
        />
      </div>

      {/* Daily Video Section (if active) */}
      {studentData.activeStatus && (
        <DailyVideoWidget />
      )}

      {/* Continue Learning Widget */}
      <ContinueLearningWidget />

      {/* Continue Learning */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
          <a href="/student/courses" className="text-purple-600 hover:text-purple-700 font-semibold flex items-center space-x-1">
            <span>View All</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isLocked={false}
                userId={user.id}
                progress={getDeterministicProgress(course.id)} // Deterministic progress
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
            <p className="text-gray-600">Browse available courses below to get started</p>
          </div>
        )}
      </div>

      {coursesError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          {coursesError}
        </div>
      )}

      {/* Explore More Courses */}
      {lockedCourses.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore More Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lockedCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isLocked={true}
                userId={user?.id}
                onRequestAccess={() => {
                  // For free courses, enrollment happens automatically via FreeEnrollButton
                  // For paid courses, show request access modal
                  if (!course.pricing || course.pricing === 0) {
                    // Free course - enrollment handled by FreeEnrollButton
                    return;
                  }
                  handleRequestAccess(course.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Course Access</h2>
            <p className="text-gray-600 mb-6">
              Send a request to the admin to unlock this course. You'll be notified once it's approved.
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
