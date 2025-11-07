"use client";

import { useState, useEffect } from 'react';
import { getCourses, getStudents, getAccessRequests } from '@/lib/data';
import Link from 'next/link';

// Deterministic function to generate consistent values based on course ID
// This ensures server and client render the same values to avoid hydration errors
function getDeterministicValue(str: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Use absolute value and modulo to get consistent result
  const range = max - min + 1;
  return Math.abs(hash) % range + min;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Fetch real user data - CRITICAL: Must fetch before showing dashboard
  useEffect(() => {
    const fetchUser = async () => {
      // First, try to get user data from sessionStorage (set during login)
      const storedUserData = sessionStorage.getItem('userData');
      let hasStoredData = false;
      if (storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          console.log('📦 Using admin user data from sessionStorage:', parsedUser);
          setUser(parsedUser);
          hasStoredData = true;
          setIsLoading(false); // Show dashboard immediately with stored data
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
        }
      }
      
      // Wait a bit for cookie to be available, then fetch from API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        console.log('🔍 Fetching admin user data from /api/auth/me...');
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
          console.log('✅ Admin user data received from API:', data.user);
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
            // If we have stored data, use it; otherwise redirect
            if (!storedUserData) {
              setIsLoading(false);
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            } else {
              setIsLoading(false);
            }
            return;
          }
        } else if (response.status === 401) {
          console.error('❌ Unauthorized (401) - cookie might not be set yet');
          // If we have stored data, use it temporarily
          if (storedUserData) {
            console.log('⚠️ Using stored user data while cookie is being set');
            setIsLoading(false);
            // Retry fetching after a delay
            setTimeout(async () => {
              try {
                const retryResponse = await fetch('/api/auth/me', { 
                  credentials: 'include',
                  cache: 'no-store'
                });
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.user) {
                    console.log('✅ Admin: Retry successful - updating user data:', retryData.user.name);
                    setUser(retryData.user);
                    sessionStorage.removeItem('userData');
                  }
                }
              } catch (e) {
                console.error('Retry failed:', e);
              }
            }, 2000);
          } else {
            setIsLoading(false);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          }
          return;
        } else {
          console.error('❌ Failed to fetch user - status:', response.status);
          // If we have stored data, use it; otherwise redirect
          if (!storedUserData) {
            setIsLoading(false);
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          } else {
            setIsLoading(false);
          }
          return;
        }
      } catch (error) {
        console.error('❌ Exception fetching user:', error);
        // If we have stored data, use it; otherwise redirect
        if (!storedUserData) {
          setIsLoading(false);
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          setIsLoading(false);
        }
        return;
      }
    };
    fetchUser();
  }, []);

  // Fetch real data from API when user is authenticated
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || user.role !== 'admin') {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);
        
        // Fetch all data in parallel
        const [coursesRes, studentsRes, requestsRes, statsRes] = await Promise.all([
          fetch('/api/admin/courses', { credentials: 'include' }),
          fetch('/api/admin/students', { credentials: 'include' }),
          fetch('/api/admin/requests', { credentials: 'include' }),
          fetch('/api/admin/stats', { credentials: 'include' }),
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses || []);
        } else {
          // Fallback to demo data if API fails
          setCourses(getCourses());
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data.students || []);
        } else {
          setStudents(getStudents());
        }

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.requests || []);
        } else {
          setRequests(getAccessRequests());
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats || {});
        } else {
          // Fallback stats
          const fallbackCourses = getCourses();
          const fallbackStudents = getStudents();
          const fallbackRequests = getAccessRequests();
          setStats({
            totalStudents: fallbackStudents.length,
            activeStudents: fallbackStudents.filter((s: any) => s.isActive).length,
            totalCourses: fallbackCourses.length,
            publishedCourses: fallbackCourses.filter((c: any) => c.status === 'published').length,
            pendingRequests: fallbackRequests.filter((r: any) => r.status === 'pending').length,
            totalEnrollments: 0,
            revenue: 0,
            completionRate: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to demo data on error
        setCourses(getCourses());
        setStudents(getStudents());
        setRequests(getAccessRequests());
        setStats({
          totalStudents: 0,
          activeStudents: 0,
          totalCourses: 0,
          publishedCourses: 0,
          pendingRequests: 0,
          totalEnrollments: 0,
          revenue: 0,
          completionRate: 0,
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Use demo data if not authenticated or data is loading
  const displayCourses = courses.length > 0 ? courses : getCourses();
  const displayStudents = students.length > 0 ? students : getStudents();
  const displayRequests = requests.length > 0 ? requests : getAccessRequests();
  const displayStats = stats || {
    totalStudents: displayStudents.length,
    activeStudents: displayStudents.filter((s: any) => s.isActive).length,
    totalCourses: displayCourses.length,
    publishedCourses: displayCourses.filter((c: any) => c.status === 'published').length,
    pendingRequests: displayRequests.filter((r: any) => r.status === 'pending').length,
    totalEnrollments: 0,
    revenue: 0,
    completionRate: 0,
  };

  const recentStudents = displayStudents.slice(0, 5);
  const recentActivity = [
    { type: 'enrollment', student: 'John Doe', course: 'Web Development', time: '5 min ago', icon: '📚' },
    { type: 'completion', student: 'Jane Smith', course: 'Advanced JavaScript', time: '12 min ago', icon: '🎓' },
    { type: 'request', student: 'Bob Wilson', course: 'React Masterclass', time: '25 min ago', icon: '📨' },
    { type: 'quiz', student: 'Alice Brown', course: 'Web Development', time: '1 hour ago', icon: '✅' },
    { type: 'login', student: 'Charlie Davis', course: null as any, time: '2 hours ago', icon: '🔐' },
  ];

  // Use deterministic values based on course ID to avoid hydration mismatch
  const topCourses = displayCourses.slice(0, 4).map((course: any) => ({
    ...course,
    enrollments: getDeterministicValue(course.id, 10, 60),
    completionRate: getDeterministicValue(course.id + '_rate', 60, 100),
  }));

  // Don't render dashboard content until user data is loaded
  if (isLoading || !user || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mb-32" />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.name || 'Admin'}! 👋
          </h1>
          <p className="text-purple-100 text-lg">Here's what's happening with your platform today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">+12% ↑</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{displayStats.totalStudents}</p>
          <p className="text-gray-600 text-sm">Total Students</p>
          <div className="mt-3 flex items-center text-sm"><span className="text-green-600 font-semibold">{displayStats.activeStudents} active</span></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">{displayStats.publishedCourses}/{displayStats.totalCourses}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{displayStats.totalCourses}</p>
          <p className="text-gray-600 text-sm">Total Courses</p>
          <div className="mt-3 flex items-center text-sm"><span className="text-blue-600 font-semibold">{displayStats.publishedCourses} published</span></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            {displayStats.pendingRequests > 0 && (<span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold animate-pulse">{displayStats.pendingRequests} new</span>)}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{displayStats.pendingRequests}</p>
          <p className="text-gray-600 text-sm">Pending Requests</p>
          <div className="mt-3"><Link href="/admin/requests" className="text-sm text-orange-600 font-semibold hover:text-orange-700">Review now →</Link></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">+8% ↑</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">₹{(displayStats.revenue / 1000).toFixed(0)}k</p>
          <p className="text-gray-600 text-sm">Total Revenue</p>
          <div className="mt-3 flex items-center text-sm"><span className="text-green-600 font-semibold">This month</span></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="text-3xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {activity.student}
                    {activity.type === 'enrollment' && ' enrolled in '}
                    {activity.type === 'completion' && ' completed '}
                    {activity.type === 'request' && ' requested access to '}
                    {activity.type === 'quiz' && ' took a quiz in '}
                    {activity.type === 'login' && ' logged in'}
                    {activity.course && <span className="text-purple-600"> {activity.course}</span>}
                  </p>
                  <p className="text-sm text-gray-600">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-purple-600 font-semibold hover:text-purple-700">View All Activity →</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Students</h3>
              <Link href="/admin/students" className="text-sm text-purple-600 font-semibold hover:text-purple-700">View All</Link>
            </div>
            <div className="space-y-3">
              {recentStudents.map(student => (
                <div key={student.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">{student.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{student.name}</p>
                    <p className="text-xs text-gray-600 truncate">{student.phone}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${student.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="font-bold mb-6 text-white">Quick Actions</h3>
            <div className="space-y-4">
              <Link href="/admin/courses">
                <button className="w-full text-left px-5 py-4 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-black/40 transition flex items-center space-x-3 text-white shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  <span className="font-semibold text-white">Create New Course</span>
                </button>
              </Link>
              <Link href="/admin/students">
                <button className="w-full text-left px-5 py-4 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-black/40 transition flex items-center space-x-3 text-white shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  <span className="font-semibold text-white">Add New Student</span>
                </button>
              </Link>
              <Link href="/admin/blogs">
                <button className="w-full text-left px-5 py-4 bg-black/30 backdrop-blur-sm rounded-xl hover:bg-black/40 transition flex items-center space-x-3 text-white shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  <span className="font-semibold text-white">Write Blog Post</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Top Performing Courses</h2>
          <Link href="/admin/courses" className="text-purple-600 font-semibold hover:text-purple-700">View All Courses →</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topCourses.map(course => (
            <div key={course.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
              <img src={course.thumbnail ?? undefined} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-3" />
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">{course.enrollments} enrolled</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{course.status}</span>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">{course.completionRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${course.completionRate}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


