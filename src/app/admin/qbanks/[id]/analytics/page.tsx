'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminQBankAnalyticsPage() {
  const params = useParams();
  const qbankId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [questionHealth, setQuestionHealth] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [qbankId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, healthRes, engagementRes] = await Promise.all([
        fetch(`/api/admin/qbanks/${qbankId}/analytics`, { credentials: 'include' }),
        fetch(`/api/admin/qbanks/${qbankId}/analytics/question-health`, { credentials: 'include' }),
        fetch(`/api/admin/qbanks/${qbankId}/analytics/engagement`, { credentials: 'include' }),
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setQuestionHealth(data.questions || []);
      }

      if (engagementRes.ok) {
        const data = await engagementRes.json();
        setEngagement(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/admin/qbanks/${qbankId}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Q-Bank
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Q-Bank Analytics</h1>
          <p className="text-gray-600 mt-2">Performance insights and question health metrics</p>
        </div>

        {/* Overview Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Enrollments</div>
              <div className="text-3xl font-bold text-gray-900">{analytics.totalEnrollments || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Active Students</div>
              <div className="text-3xl font-bold text-blue-600">{analytics.activeStudents || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Tests Completed</div>
              <div className="text-3xl font-bold text-green-600">{analytics.testsCompleted || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Avg Questions/Day</div>
              <div className="text-3xl font-bold text-purple-600">
                {engagement?.avgQuestionsPerDay?.toFixed(1) || 0}
              </div>
            </div>
          </div>
        )}

        {/* Question Health */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Question Health Analysis</h2>
          <p className="text-sm text-gray-600 mb-4">
            Questions with &lt;10% or &gt;90% accuracy may need review
          </p>
          {questionHealth.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No question health data available yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question Preview</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questionHealth.map((q: any) => {
                    const isProblematic = q.accuracyPercentage < 10 || q.accuracyPercentage > 90;
                    return (
                      <tr key={q.id} className={isProblematic ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{q.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div 
                            className="line-clamp-2"
                            dangerouslySetInnerHTML={{ 
                              __html: (q.question || '').substring(0, 100) + '...' 
                            }} 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            q.accuracyPercentage < 10 
                              ? 'bg-red-100 text-red-800'
                              : q.accuracyPercentage > 90
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {q.accuracyPercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {q.attempts}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isProblematic ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Needs Review
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/qbanks/${qbankId}/questions/${q.id}/edit`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Student Engagement */}
        {engagement && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Student Engagement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Average Questions per Day</div>
                <div className="text-2xl font-bold text-gray-900">
                  {engagement.avgQuestionsPerDay?.toFixed(1) || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Total Questions Attempted</div>
                <div className="text-2xl font-bold text-blue-600">
                  {engagement.totalQuestionsAttempted || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Active Students (Last 7 Days)</div>
                <div className="text-2xl font-bold text-green-600">
                  {engagement.activeStudentsLast7Days || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




