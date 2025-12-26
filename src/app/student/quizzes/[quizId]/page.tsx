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
          className="text-nurse-silver-400 hover:text-white font-medium flex items-center gap-2 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-white shadow-sm">{quiz.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-nurse-silver-400">
          <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Pass Mark: {quiz.passMark}%</span>
          {quiz.timeLimit && <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Time Limit: {quiz.timeLimit} minutes</span>}
          {quiz.maxAttempts && (
            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Attempts: {quiz.previousAttempts?.length || 0} / {quiz.maxAttempts}
            </span>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Questions Available</h3>
          <p className="text-nurse-silver-400 mb-6">This quiz currently has no questions assigned to it.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      ) : (
        <QuizCard
          questions={questions}
          passMark={quiz.passMark}
          showAnswers={quiz.showAnswers}
          timeLimit={quiz.timeLimit}
          quizId={quizId}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

