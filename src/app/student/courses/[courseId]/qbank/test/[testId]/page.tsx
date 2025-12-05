'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QuizCard from '@/components/student/QuizCard';

interface Question {
  id: number;
  question: string;
  options: string[];
  type: string;
  explanation?: string;
}

interface Test {
  id: number;
  testId: string;
  title: string;
  mode: string;
  totalQuestions: number;
  questionIds: number[];
  questions: Question[];
}

export default function QBankTestPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      setIsLoading(true);
      
      // Get test details
      const testResponse = await fetch(`/api/qbank/${courseId}/tests/${testId}`, {
        credentials: 'include',
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}));
        console.error('❌ Test fetch failed:', testResponse.status, errorData);
        setError('Test not found');
        return;
      }

      const testData = await testResponse.json();
      console.log('✅ Test data received:', testData);
      setTest(testData.test);

      // Get questions for this test
      const questionIds = JSON.parse(testData.test.questionIds || '[]');
      console.log('📝 Question IDs in test:', questionIds);
      
      if (questionIds.length === 0) {
        console.error('❌ No question IDs in test');
        setError('No questions in this test');
        return;
      }

      // Fetch questions by IDs using the dedicated endpoint
      const questionsResponse = await fetch(
        `/api/qbank/questions?ids=${encodeURIComponent(JSON.stringify(questionIds))}`,
        { credentials: 'include' }
      );

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json().catch(() => ({}));
        console.error('❌ Questions fetch failed:', questionsResponse.status, errorData);
        setError('Failed to load questions');
        return;
      }

      const questionsData = await questionsResponse.json();
      console.log(`✅ Fetched ${questionsData.questions.length} questions`);
      
      if (questionsData.questions.length === 0) {
        console.error('❌ No questions returned from API for IDs:', questionIds);
        setError('Questions not found in database');
        return;
      }

      // Map to expected format for QuizCard
      const testQuestions = questionsData.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        type: q.type || q.questionType || 'multiple_choice',
      }));

      console.log(`✅ ${testQuestions.length} questions ready for test`);
      setQuestions(testQuestions);
    } catch (error: any) {
      console.error('❌ Error fetching test:', error);
      setError('Failed to load test');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (answers: any, score: number) => {
    try {
      // Submit test results
      const response = await fetch(`/api/student/courses/${courseId}/qbank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answers,
          testTitle: test?.title || 'Practice Test',
          testMode: test?.mode || 'tutorial',
          testType: 'mixed',
          organization: 'subject',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Navigate to results or back to Q-Bank
        router.push(`/student/qbank/${courseId}`);
      } else {
        alert('Failed to submit test');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-md shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/student/qbank/${courseId}`)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
          >
            Back to Q-Bank
          </button>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions available</p>
          <button
            onClick={() => router.push(`/student/qbank/${courseId}`)}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Back to Q-Bank
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizCard
        questions={questions}
        quizTitle={test.title || 'Practice Test'}
        onComplete={handleSubmit}
      />
    </div>
  );
}

