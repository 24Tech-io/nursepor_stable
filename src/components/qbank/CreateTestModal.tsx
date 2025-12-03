'use client';

import { useState, useEffect } from 'react';

interface CreateTestModalProps {
  courseId: string;
  onClose: () => void;
  onTestCreated: () => void;
}

interface QuestionFilters {
  subjects: string[];
  lessons: string[];
  clientNeedAreas: string[];
  subcategories: string[];
  questionTypes: string[];
}

export default function CreateTestModal({
  courseId,
  onClose,
  onTestCreated,
}: CreateTestModalProps) {
  const [mode, setMode] = useState<'cat' | 'tutorial' | 'timed' | 'readiness_assessment'>(
    'tutorial'
  );
  const [testType, setTestType] = useState<'classic' | 'ngn' | 'mixed'>('mixed');
  const [organization, setOrganization] = useState<'subject' | 'client_need'>('subject');
  const [questionType, setQuestionType] = useState<string>('all');
  const [questionFilter, setQuestionFilter] = useState<
    'all' | 'unused' | 'marked' | 'incorrect' | 'correct_reattempt' | 'omitted'
  >('all');
  const [testLength, setTestLength] = useState<number>(85);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [selectedClientNeedArea, setSelectedClientNeedArea] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [filters, setFilters] = useState<QuestionFilters>({
    subjects: [],
    lessons: [],
    clientNeedAreas: [],
    subcategories: [],
    questionTypes: [],
  });
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Mock question counts
  const questionCounts = {
    all: { classic: 2010, ngn: 1171 },
    unused: { classic: 416, ngn: 281 },
    marked: { classic: 1, ngn: 0 },
    incorrect: { classic: 834, ngn: 685 },
    correct_reattempt: { classic: 5, ngn: 4 },
    omitted: { classic: 3, ngn: 0 },
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [courseId]);

  useEffect(() => {
    fetchAvailableQuestions();
  }, [
    courseId,
    testType,
    organization,
    questionType,
    selectedSubject,
    selectedLesson,
    selectedClientNeedArea,
    selectedSubcategory,
  ]);

  async function fetchFilterOptions() {
    try {
      const response = await fetch(`/api/qbank/${courseId}/questions`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setFilters(
          data.filters || {
            subjects: [],
            lessons: [],
            clientNeedAreas: [],
            subcategories: [],
            questionTypes: [],
          }
        );
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }

  async function fetchAvailableQuestions() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('testType', testType);
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedLesson) params.append('lesson', selectedLesson);
      if (selectedClientNeedArea) params.append('clientNeedArea', selectedClientNeedArea);
      if (selectedSubcategory) params.append('subcategory', selectedSubcategory);
      if (questionType !== 'all') params.append('questionType', questionType);

      const response = await fetch(`/api/qbank/${courseId}/questions?${params.toString()}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching available questions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTest() {
    try {
      setIsCreating(true);

      // Select random questions up to testLength
      const selectedQuestions = availableQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(testLength, availableQuestions.length))
        .map((q) => q.id);

      if (selectedQuestions.length === 0) {
        alert('No questions available with the selected filters. Please adjust your filters.');
        setIsCreating(false);
        return;
      }

      const response = await fetch(`/api/qbank/${courseId}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          testType,
          organization,
          questionIds: selectedQuestions,
          timeLimit: mode === 'timed' ? Math.ceil(testLength * 1.5) : null, // 1.5 minutes per question
        }),
      });

      if (response.ok) {
        onTestCreated();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Test</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Q-Bank Mode */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Q-Bank Mode</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setMode('cat')}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  mode === 'cat'
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-orange-500"
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
                  <span className="font-semibold text-gray-900">CAT</span>
                </div>
                <div className="text-xs text-gray-600">Adaptive Test</div>
              </button>
              <button
                onClick={() => setMode('tutorial')}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  mode === 'tutorial'
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span className="font-semibold text-gray-900">Tutorial</span>
                </div>
                <div className="text-xs text-gray-600">Instant explanations</div>
              </button>
              <button
                onClick={() => setMode('timed')}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  mode === 'timed'
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-purple-500"
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
                  <span className="font-semibold text-gray-900">Timed</span>
                </div>
                <div className="text-xs text-gray-600">With time limit</div>
              </button>
              <button
                onClick={() => setMode('readiness_assessment')}
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  mode === 'readiness_assessment'
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-2">Readiness Assessment</div>
                <div className="text-xs text-gray-600">Full assessment</div>
              </button>
            </div>

            {/* Mode Description */}
            {mode === 'tutorial' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    <p className="font-semibold text-blue-900">Tutorial</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Receive instant explanations after submitting your answers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Type */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Type</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setTestType('classic')}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  testType === 'classic'
                    ? 'border-gray-600 bg-gray-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Classic
              </button>
              <button
                onClick={() => setTestType('ngn')}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  testType === 'ngn'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                NGN
              </button>
              <button
                onClick={() => setTestType('mixed')}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  testType === 'mixed'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Mixed
              </button>
            </div>
          </div>

          {/* Organization */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Organization</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setOrganization('subject')}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  organization === 'subject'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Subject or System
              </button>
              <button
                onClick={() => setOrganization('client_need')}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  organization === 'client_need'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Client Need Areas
              </button>
            </div>
          </div>

          {/* Question Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Question Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setQuestionType('all')}
                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                  questionType === 'all'
                    ? 'border-blue-600 bg-blue-50 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">All (3181)</div>
              </button>
              <button
                onClick={() => setQuestionType('sata')}
                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                  questionType === 'sata'
                    ? 'border-blue-600 bg-blue-50 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">SATA (548)</div>
              </button>
              <button
                onClick={() => setQuestionType('unfolding_ngn')}
                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                  questionType === 'unfolding_ngn'
                    ? 'border-blue-600 bg-blue-50 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Unfolding NGN Case Studies (70)</div>
              </button>
              <button
                onClick={() => setQuestionType('standalone_ngn')}
                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                  questionType === 'standalone_ngn'
                    ? 'border-blue-600 bg-blue-50 font-semibold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Standalone NGN Case Studies (177)</div>
              </button>
            </div>
          </div>

          {/* Question Filters */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Question Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => setQuestionFilter('unused')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'unused'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Unused</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.unused.classic} Classic + {questionCounts.unused.ngn} NGN
                </div>
              </button>
              <button
                onClick={() => setQuestionFilter('marked')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'marked'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Marked</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.marked.classic} Classic
                </div>
              </button>
              <button
                onClick={() => setQuestionFilter('incorrect')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'incorrect'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Incorrect</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.incorrect.classic} Classic + {questionCounts.incorrect.ngn} NGN
                </div>
              </button>
              <button
                onClick={() => setQuestionFilter('all')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'all'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">All</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.all.classic} Classic + {questionCounts.all.ngn} NGN
                </div>
              </button>
              <button
                onClick={() => setQuestionFilter('correct_reattempt')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'correct_reattempt'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Correct On Reattempt</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.correct_reattempt.classic} Classic +{' '}
                  {questionCounts.correct_reattempt.ngn} NGN
                </div>
              </button>
              <button
                onClick={() => setQuestionFilter('omitted')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  questionFilter === 'omitted'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">Omitted</div>
                <div className="text-xs text-gray-600 mt-1">
                  {questionCounts.omitted.classic} Classic
                </div>
              </button>
            </div>
          </div>

          {/* Filters based on Organization */}
          {organization === 'subject' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Subjects</option>
                  {filters.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lesson</label>
                <select
                  value={selectedLesson}
                  onChange={(e) => setSelectedLesson(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Lessons</option>
                  {filters.lessons.map((lesson) => (
                    <option key={lesson} value={lesson}>
                      {lesson}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Need Area
                </label>
                <select
                  value={selectedClientNeedArea}
                  onChange={(e) => setSelectedClientNeedArea(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Client Need Areas</option>
                  {filters.clientNeedAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Subcategories</option>
                  {filters.subcategories.map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom Test Length */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Test Length</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of questions per test (maximum of 150)
            </label>
            <input
              type="number"
              min="1"
              max="150"
              value={testLength}
              onChange={(e) =>
                setTestLength(Math.min(150, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-bold"
            />
            <p className="mt-3 text-sm text-gray-600 text-center">
              {Math.min(testLength, availableQuestions.length)} questions will be selected for this
              test
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTest}
              disabled={isCreating || availableQuestions.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
