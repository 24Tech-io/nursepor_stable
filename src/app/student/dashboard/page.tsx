'use client';

import { useState } from 'react';
import StatCard from '../../../components/student/StatCard';
import CourseCard from '../../../components/student/CourseCard';
import { getCourses } from '../../../lib/data';

export default function StudentDashboard() {
  const [courses] = useState(getCourses());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');

  // Mock data - in real app, this would come from API
  const studentData = {
    name: 'John Doe',
    enrolledCourses: ['course-1'],
    activeStatus: true,
  };

  const stats = {
    coursesEnrolled: 2,
    coursesCompleted: 0,
    hoursLearned: 12.5,
    quizzesCompleted: 8,
    currentStreak: 5,
    totalPoints: 450,
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
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {studentData.name}! 👋
          </h1>
          <p className="text-blue-100 text-lg">
            Ready to continue your learning journey today?
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{stats.currentStreak}</div>
              <div className="text-sm text-blue-100">Day Streak 🔥</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{stats.coursesEnrolled}</div>
              <div className="text-sm text-blue-100">Active Courses</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{stats.hoursLearned}</div>
              <div className="text-sm text-blue-100">Hours Learned</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold text-white">{stats.totalPoints}</div>
              <div className="text-sm text-blue-100">Points Earned 🏆</div>
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
          value={stats.hoursLearned}
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
                progress={Math.floor(Math.random() * 70) + 10} // Mock progress
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
