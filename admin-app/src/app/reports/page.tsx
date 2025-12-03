'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Users, BookOpen, Clock, Eye } from 'lucide-react';

interface EnrollmentStat {
  courseId: number;
  courseTitle: string;
  enrollmentCount: number;
  avgProgress: number;
}

interface StudentStats {
  total: number;
  active: number;
  inactive: number;
  recentActiveCount: number;
}

interface EngagementStats {
  totalWatchTimeSeconds: number;
  totalWatchTimeHours: string;
  videoStats: {
    total: number;
    completed: number;
    completionRate: string;
  };
  quizAttempts: number;
  avgStudentProgress: string;
}

export default function ReportsPage() {
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentStat[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [engagementStats, setEngagementStats] = useState<EngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [enrollmentRes, studentsRes, engagementRes] = await Promise.all([
        fetch('/api/admin/reports/enrollment', { credentials: 'include' }),
        fetch('/api/admin/reports/students', { credentials: 'include' }),
        fetch('/api/admin/reports/engagement', { credentials: 'include' }),
      ]);

      if (enrollmentRes.ok) {
        const data = await enrollmentRes.json();
        setEnrollmentData(data.enrollmentStats || []);
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudentStats(data.students);
      }

      if (engagementRes.ok) {
        const data = await engagementRes.json();
        setEngagementStats(data.engagement);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reports & Analytics</h1>
          <p className="text-slate-400">Monitor platform performance and student engagement</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="text-blue-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{studentStats?.total || 0}</h3>
            <p className="text-slate-400 text-sm">Total Students</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-green-400 text-xs font-semibold">
                {studentStats?.active || 0} Active
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-red-400 text-xs font-semibold">
                {studentStats?.inactive || 0} Inactive
              </span>
            </div>
          </div>

          {/* Active Users (Recent) */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {studentStats?.recentActiveCount || 0}
            </h3>
            <p className="text-slate-400 text-sm">Active Last 30 Days</p>
          </div>

          {/* Total Watch Time */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Clock className="text-purple-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {engagementStats?.totalWatchTimeHours || '0'}
            </h3>
            <p className="text-slate-400 text-sm">Total Watch Hours</p>
          </div>

          {/* Video Completion Rate */}
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Eye className="text-orange-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {engagementStats?.videoStats.completionRate || '0'}%
            </h3>
            <p className="text-slate-400 text-sm">Video Completion</p>
            <p className="text-slate-600 text-xs mt-1">
              {engagementStats?.videoStats.completed || 0} /{' '}
              {engagementStats?.videoStats.total || 0} videos
            </p>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Engagement Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Quiz Attempts</span>
                <span className="text-white font-bold">{engagementStats?.quizAttempts || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg Student Progress</span>
                <span className="text-white font-bold">
                  {engagementStats?.avgStudentProgress || '0'}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Videos Watched</span>
                <span className="text-white font-bold">
                  {engagementStats?.videoStats.completed || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Student Distribution</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Active Students</span>
                  <span className="text-green-400 font-semibold">
                    {studentStats
                      ? ((studentStats.active / studentStats.total) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${studentStats ? (studentStats.active / studentStats.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Inactive Students</span>
                  <span className="text-red-400 font-semibold">
                    {studentStats
                      ? ((studentStats.inactive / studentStats.total) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${studentStats ? (studentStats.inactive / studentStats.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Enrollment Table */}
        <div className="bg-[#161922] border border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Course Enrollment Statistics</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm">
                    Course
                  </th>
                  <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm">
                    Enrollments
                  </th>
                  <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm">
                    Avg Progress
                  </th>
                  <th className="text-right py-4 px-4 text-slate-400 font-semibold text-sm">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.map((course) => (
                  <tr
                    key={course.courseId}
                    className="border-b border-slate-800/40 hover:bg-slate-800/20 transition"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="text-blue-400" size={20} />
                        <span className="text-white font-medium">{course.courseTitle}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-semibold">{course.enrollmentCount}</span>
                      <span className="text-slate-500 ml-1">students</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-800 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${course.avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold text-sm">
                          {Number(course.avgProgress).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          course.enrollmentCount > 10
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {course.enrollmentCount > 10 ? 'Popular' : 'Growing'}
                      </span>
                    </td>
                  </tr>
                ))}
                {enrollmentData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No enrollment data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
