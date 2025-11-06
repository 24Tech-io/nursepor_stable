'use client';

import { useState, useEffect } from 'react';
import StatCard from '../../../components/student/StatCard';
import CourseCard from '../../../components/student/CourseCard';
import { getCourses } from '../../../lib/data';

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
  const [courses] = useState(getCourses());
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

  // Fetch stats and enrolled courses
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const [statsResponse, coursesResponse] = await Promise.all([
          fetch('/api/student/stats', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/student/enrolled-courses', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
          console.log('✅ Stats fetched:', statsData.stats);
        }

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          const courseIds = coursesData.enrolledCourses.map((ec: any) => ec.courseId);
          setEnrolledCourseIds(courseIds);
          console.log('✅ Enrolled courses fetched:', courseIds);
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

  const submitAccessRequest = () => {
    alert(`Access request submitted for course: ${selectedCourse}\nNote: ${requestNote}`);
    setShowRequestModal(false);
    setRequestNote('');
    setSelectedCourse(null);
  };

  const enrolledCourses = courses.filter(c =>
    studentData.enrolledCourses.includes(c.id) && c.status === 'published'
  );

  const lockedCourses = courses.filter(c =>
    !studentData.enrolledCourses.includes(c.id) && c.status === 'published' && c.isRequestable
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(to right, #9333ea, #2563eb, #4f46e5)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2 text-white">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-blue-100 text-lg">
            Ready to continue your learning journey today?
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-bold">
                  TODAY'S VIDEO
                </span>
                <span className="text-sm opacity-90">Available for 24 hours</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Introduction to React Hooks</h2>
              <p className="text-pink-100 mb-4">Learn the fundamentals of useState and useEffect</p>
              <button className="bg-white text-pink-600 px-6 py-3 rounded-xl font-semibold hover:bg-pink-50 transition shadow-lg flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                <span>Watch Now</span>
              </button>
            </div>
            <div className="hidden md:block">
              <div className="w-32 h-32 bg-white bg-opacity-10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

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
                userId={1} // TODO: Get from auth context
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
                userId={1} // TODO: Get from auth context
                onRequestAccess={() => handleRequestAccess(course.id)}
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
