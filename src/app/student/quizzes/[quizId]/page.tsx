'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuizCard from '@/components/student/QuizCard';
import LoadingSpinner from '@/components/student/LoadingSpinner';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/student/quizzes/${quizId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setQuiz(data.quiz);
      } else if (response.status === 404) {
        setError('Quiz not found');
      } else {
        setError('Failed to load quiz');
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (score: number, passed: boolean) => {
    // Quiz submission is handled by QuizCard component
    // This is just for navigation after completion
    router.push(`/student/quizzes/${quizId}/results?score=${score}&passed=${passed}`);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading quiz..." fullScreen />;
  }

  if (error || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Quiz not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Convert quiz questions to MCQQuestion format
  const questions = quiz.questions.map((q: any) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span>Pass Mark: {quiz.passMark}%</span>
          {quiz.timeLimit && <span>Time Limit: {quiz.timeLimit} minutes</span>}
          {quiz.maxAttempts && (
            <span>
              Attempts: {quiz.previousAttempts?.length || 0} / {quiz.maxAttempts}
            </span>
          )}
        </div>
      </div>

      <QuizCard
        questions={questions}
        passMark={quiz.passMark}
        showAnswers={quiz.showAnswers}
        timeLimit={quiz.timeLimit}
        quizId={quizId}
        onComplete={handleComplete}
      />
    </div>
  );
}

