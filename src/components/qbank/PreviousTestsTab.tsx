'use client';

import { useState, useEffect } from 'react';

interface Test {
  id: number;
  testId: string;
  title: string | null;
  mode: string;
  testType: string;
  totalQuestions: number;
  status: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface PreviousTestsTabProps {
  courseId: string;
}

export default function PreviousTestsTab({ courseId }: PreviousTestsTabProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchTests();
  }, [courseId]);

  async function fetchTests() {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/qbank/${courseId}/tests`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
        setPendingCount(data.pendingCount || 0);
        setCompletedCount(data.completedCount || 0);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  }

  function getStatusBadge(status: string) {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      abandoned: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  }

  function handleResumeTest(test: Test) {
    // Navigate to test page
    window.location.href = `/student/courses/${courseId}/qbank/test/${test.testId}`;
  }

  function handleStartTest(test: Test) {
    // Navigate to test page
    window.location.href = `/student/courses/${courseId}/qbank/test/${test.testId}`;
  }

  const filteredTests = tests.filter(test => {
    if (filter === 'pending') {
      return test.status === 'pending' || test.status === 'in_progress';
    }
    if (filter === 'completed') {
      return test.status === 'completed';
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-900'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Tests ({tests.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-100 text-yellow-900'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Pending Test ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-100 text-green-900'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Completed Test ({completedCount})
        </button>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No tests found. Create your first test to get started!
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.testId}</div>
                      {test.title && (
                        <div className="text-xs text-gray-500">{test.title}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {test.percentage !== null ? (
                        <div className="text-sm font-semibold text-gray-900">
                          {test.percentage.toFixed(0)}%
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">0%</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(test.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {test.mode === 'cat' ? 'CAT' : 
                         test.mode === 'tutorial' ? 'Tutorial' :
                         test.mode === 'timed' ? 'Timed' :
                         test.mode === 'readiness_assessment' ? 'Readiness Assessment' :
                         test.mode}
                      </div>
                      <div className="text-xs text-gray-500">
                        {test.testType === 'classic' ? 'Classic' :
                         test.testType === 'ngn' ? 'NGN' :
                         test.testType === 'mixed' ? 'Mixed' : test.testType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {test.totalQuestions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        + Add Remarks
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {test.status === 'pending' || test.status === 'in_progress' ? (
                        <button
                          onClick={() => test.status === 'in_progress' ? handleResumeTest(test) : handleStartTest(test)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{test.status === 'in_progress' ? 'Resume Test' : 'Start Test'}</span>
                        </button>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(test.status)}`}>
                          {test.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

