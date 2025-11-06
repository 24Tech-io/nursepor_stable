// src/app/admin/reports/page.tsx

'use client';

import { useState } from 'react';
import { getStudents, getCourses, getAccessRequests } from '../../../lib/data';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'courses' | 'requests'>('overview');

  const students = getStudents();
  const courses = getCourses();
  const requests = getAccessRequests();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'requests', label: 'Requests', icon: '📋' }
  ];

  const totalRevenue = courses.reduce((sum, course) => sum + (course.pricing || 0), 0);
  const activeStudents = students.filter(s => s.isActive).length;
  const totalEnrollments = 45; // Mock data
  const completionRate = 78; // Mock data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Reports & Analytics</h1>
          <p className="text-xl text-blue-100 mb-6">
            Comprehensive insights into platform performance and user engagement
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">{students.length}</p>
              <p className="text-blue-200">Total Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">{courses.length}</p>
              <p className="text-blue-200">Active Courses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">₹{totalRevenue.toLocaleString()}</p>
              <p className="text-blue-200">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold mb-1">{completionRate}%</p>
              <p className="text-blue-200">Avg Completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1">{activeStudents}</p>
                  <p className="text-blue-100">Active Students</p>
                  <p className="text-sm text-blue-200 mt-2">+12% from last month</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1">{totalEnrollments}</p>
                  <p className="text-green-100">Total Enrollments</p>
                  <p className="text-sm text-green-200 mt-2">+8% from last month</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1">₹{totalRevenue.toLocaleString()}</p>
                  <p className="text-purple-100">Revenue</p>
                  <p className="text-sm text-purple-200 mt-2">+15% from last month</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1">{completionRate}%</p>
                  <p className="text-orange-100">Completion Rate</p>
                  <p className="text-sm text-orange-200 mt-2">+5% from last month</p>
                </div>
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Enrollment Trends</h3>
                  <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-gray-500">Enrollment chart would go here</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h3>
                  <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      <p className="text-gray-500">Performance chart would go here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
                <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition">
                  Export Data
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Student</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Courses</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{student.name}</p>
                                <p className="text-sm text-gray-500">{student.bio?.substring(0, 30)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{student.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              student.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {student.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {student.joinedDate?.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-gray-900">3</td>
                          <td className="px-6 py-4">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Course Analytics</h2>
                <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition">
                  Export Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{course.instructor}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          course.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Enrollments</span>
                        <span className="font-semibold">12</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-semibold">85%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue</span>
                        <span className="font-semibold">₹{(course.pricing || 0) * 12}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rating</span>
                        <span className="font-semibold">4.8 ⭐</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Access Requests</h2>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition">
                    Pending ({requests.filter(r => r.status === 'pending').length})
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition">
                    Export
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {requests.map(request => (
                  <div key={request.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {request.studentName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{request.studentName}</h3>
                          <p className="text-sm text-gray-600 mb-2">Requested access to: <span className="font-semibold">{request.courseTitle}</span></p>
                          <p className="text-gray-700 text-sm leading-relaxed">"{request.reason}"</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Requested on {request.requestedAt.toLocaleDateString()}
                        {request.reviewedAt && ` • Reviewed on ${request.reviewedAt.toLocaleDateString()}`}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                            Approve
                          </button>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
