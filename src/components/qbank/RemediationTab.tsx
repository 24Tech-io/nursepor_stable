'use client';

import { useState, useEffect } from 'react';

interface RemediationData {
  incorrectQuestions: number;
  correctQuestions: number;
  subjectBreakdown: Array<{
    subject: string;
    count: number;
    percentage: number;
  }>;
  questionsByCategory: {
    pendingReview: number;
    lowConfidence: number;
    highConfidence: number;
    correctOnReattempt: number;
  };
}

interface RemediationTabProps {
  courseId: string;
}

export default function RemediationTab({ courseId }: RemediationTabProps) {
  const [data, setData] = useState<RemediationData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'pending_review' | 'low_confidence' | 'high_confidence' | 'correct_on_reattempt' | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRemediationData();
  }, [courseId]);

  async function fetchRemediationData() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/qbank/${courseId}/remediation`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        // If no data, set empty state
        setData({
          incorrectQuestions: 0,
          correctQuestions: 0,
          subjectBreakdown: [],
          questionsByCategory: {
            pendingReview: 0,
            lowConfidence: 0,
            highConfidence: 0,
            correctOnReattempt: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching remediation data:', error);
      setData({
        incorrectQuestions: 0,
        correctQuestions: 0,
        subjectBreakdown: [],
        questionsByCategory: {
          pendingReview: 0,
          lowConfidence: 0,
          highConfidence: 0,
          correctOnReattempt: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  function getCategoryCount(category: string): number {
    if (!data) return 0;
    switch (category) {
      case 'pending_review':
        return data.questionsByCategory.pendingReview;
      case 'low_confidence':
        return data.questionsByCategory.lowConfidence;
      case 'high_confidence':
        return data.questionsByCategory.highConfidence;
      case 'correct_on_reattempt':
        return data.questionsByCategory.correctOnReattempt;
      default:
        return 0;
    }
  }

  function getCategoryLabel(category: string): string {
    switch (category) {
      case 'pending_review':
        return 'Pending Review';
      case 'low_confidence':
        return 'Low Confidence';
      case 'high_confidence':
        return 'High Confidence';
      case 'correct_on_reattempt':
        return 'Correct on re-attempt';
      default:
        return '';
    }
  }

  function getCategoryDescription(category: string): string {
    switch (category) {
      case 'pending_review':
        return 'Questions that need your review and categorization';
      case 'low_confidence':
        return 'Questions you marked as low confidence - review these regularly';
      case 'high_confidence':
        return 'Questions you marked as high confidence - you understand these well';
      case 'correct_on_reattempt':
        return 'Questions answered correctly after your review';
      default:
        return '';
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No remediation data available. Complete some tests to see your performance.
        </p>
      </div>
    );
  }

  const totalIncorrect = data.incorrectQuestions;
  const totalCorrect = data.correctQuestions;
  const totalQuestions = totalIncorrect + totalCorrect;
  const incorrectPercentage = totalQuestions > 0 ? (totalIncorrect / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center space-x-3 mb-4">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Remediation</h2>
        </div>
        <p className="text-gray-700">
          Leverage Archer's Remediation feature to meticulously improvise your learning by
          categorizing questions according to your confidence level and master the subject
          effortlessly.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Incorrect Questions</h3>
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-2xl font-bold text-red-600">{totalIncorrect}</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            This includes Incorrect, Omitted and Partially Correct questions
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Correct Questions</h3>
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-2xl font-bold text-green-600">{totalCorrect}</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">Questions answered correctly on first attempt</div>
        </div>
      </div>

      {/* Lesson Breakdown Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Lesson Breakdown</h3>
          <div className="text-sm text-gray-600">
            <span className="font-medium">no of questions in %</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Y-axis labels */}
          <div className="flex items-center mb-2">
            <div className="w-32 text-right pr-4 text-xs text-gray-500">0</div>
            <div className="flex-1 flex justify-between text-xs text-gray-500 px-2">
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>

          {/* Sample lesson data */}
          {[
            { name: 'cardiovascular', count: 124 },
            { name: 'urinary/renal/fluid and electrolytes', count: 73 },
            { name: 'respiratory', count: 89 },
            { name: 'gastrointestinal', count: 111 },
            { name: 'endocrine', count: 121 },
            { name: 'analgesics', count: 18 },
            { name: 'blood and blood products', count: 10 },
            { name: 'immune', count: 14 },
            { name: 'perioperative care', count: 28 },
            { name: 'mental health', count: 90 },
            { name: 'safety / infection control', count: 80 },
            { name: 'ethical/legal', count: 37 },
            { name: 'antepartum', count: 88 },
            { name: 'management concepts', count: 24 },
            { name: 'musculoskeletal', count: 63 },
            { name: 'infectious disease', count: 32 },
            { name: 'neurologic', count: 95 },
            { name: 'dosage calculation', count: 11 },
            { name: 'critical care concepts', count: 58 },
            { name: 'basic care & comfort', count: 43 },
          ].map((lesson, index) => {
            const percentage =
              totalIncorrect > 0 ? Math.min((lesson.count / totalIncorrect) * 100, 100) : 0;

            return (
              <div
                key={index}
                className="flex items-center group hover:bg-gray-50 p-2 rounded-lg transition"
              >
                <div className="w-32 text-right pr-4 text-xs text-gray-700">{lesson.name}</div>
                <div className="flex-1 flex items-center">
                  <div className="w-full bg-gray-100 rounded-full h-6 relative">
                    <div
                      className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-semibold text-white">({lesson.count})</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence Level Flow */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-200">
        <div className="flex items-center space-x-2 mb-6">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <h3 className="text-xl font-bold text-gray-900">Confidence Level Progression</h3>
        </div>

        <div className="flex items-center justify-between space-x-4">
          {/* Pending Review */}
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-yellow-200 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                  {data.questionsByCategory.pendingReview || 1531}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Pending Review</h4>
              <p className="text-xs text-gray-600">
                {data.questionsByCategory.pendingReview || 1531} Questions
              </p>
              <button className="mt-4 w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition">
                Review
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* Low Confidence */}
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-red-200 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">
                  {data.questionsByCategory.lowConfidence || 0}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Low Confidence</h4>
              <p className="text-xs text-gray-600">Needs practice</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* High Confidence */}
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-200 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                  {data.questionsByCategory.highConfidence || 0}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">High Confidence</h4>
              <p className="text-xs text-gray-600">Well understood</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* Correct on Re-attempt */}
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-blue-200 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                  {data.questionsByCategory.correctOnReattempt || 0}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Correct on re-attempt</h4>
              <p className="text-xs text-gray-600">Mastered after review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cards - Old Design */}
      <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['pending_review', 'low_confidence', 'high_confidence', 'correct_on_reattempt'].map(
          (category) => {
            const count = getCategoryCount(category);
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(isSelected ? null : (category as any))}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      category === 'pending_review'
                        ? 'bg-yellow-100'
                        : category === 'low_confidence'
                          ? 'bg-red-100'
                          : category === 'high_confidence'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                    }`}
                  >
                    {category === 'pending_review' && (
                      <svg
                        className="w-6 h-6 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {category === 'low_confidence' && (
                      <svg
                        className="w-6 h-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {category === 'high_confidence' && (
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {category === 'correct_on_reattempt' && (
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      category === 'pending_review'
                        ? 'bg-yellow-100 text-yellow-800'
                        : category === 'low_confidence'
                          ? 'bg-red-100 text-red-800'
                          : category === 'high_confidence'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {count}
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{getCategoryLabel(category)}</h4>
                <p className="text-xs text-gray-600">{getCategoryDescription(category)}</p>
              </button>
            );
          }
        )}
      </div>

      {/* Selected Category Details */}
      {selectedCategory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {getCategoryLabel(selectedCategory)} Questions
            </h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mb-4">{getCategoryDescription(selectedCategory)}</p>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              {getCategoryCount(selectedCategory)} questions in this category
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Question list and review functionality will be implemented here
            </p>
          </div>
        </div>
      )}

      {/* Info Section */}
      {selectedCategory === 'correct_on_reattempt' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">Correct on re-attempt</p>
              <p className="text-sm text-blue-700 mt-1">
                This section contains questions that are answered correctly after your review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
