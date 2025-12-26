'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft } from 'lucide-react';
import { syncClient } from '@/lib/sync-client';
import Link from 'next/link';

export default function CourseQBankPage({ params }: { params: { courseId: string } }) {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const [showExplanations, setShowExplanations] = React.useState(false);

  useEffect(() => {
    fetchQuestions();

    // Start sync client for real-time updates
    syncClient.start();
    const handleSync = () => {
      fetchQuestions();
    };
    syncClient.on('sync', handleSync);

    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/student/courses/${params.courseId}/qbank`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (
        !confirm(
          `You've only answered ${Object.keys(answers).length} out of ${questions.length} questions. Submit anyway?`
        )
      ) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/student/courses/${params.courseId}/qbank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowExplanations(true);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeJsonParse = (value: any, fallback: any = []) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500 mx-auto"></div>
            <p className="mt-4 text-nurse-silver-400">Loading practice questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-8">
        {/* Back Button */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-nurse-silver-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Course</span>
          </button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Course Practice Questions</h1>
          <p className="text-nurse-silver-400">Test your knowledge with quiz bank questions</p>
        </div>

        {/* Empty State Card */}
        <div className="text-center py-12 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-nurse-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-red-500/20">
            <svg className="w-8 h-8 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Practice Questions Yet</h2>
          <p className="text-nurse-silver-400 mb-6 max-w-md mx-auto">
            Your instructor hasn't added Quiz Bank questions to this course yet.
            Check back later or explore other Q-Banks.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/student/qbanks"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white rounded-lg font-medium transition-colors shadow-glow-red"
            >
              <Award size={20} />
              Browse Q-Banks
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/10"
            >
              <ArrowLeft size={20} />
              Back to Course
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Practice Anytime</h3>
                <p className="text-sm text-nurse-silver-400">Once questions are added, you can practice as many times as you want.</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Track Your Progress</h3>
                <p className="text-sm text-nurse-silver-400">Get instant feedback and detailed explanations for each question.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="space-y-8">
        {/* Results Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${results.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
              {results.passed ? <CheckCircle size={40} /> : <XCircle size={40} />}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {results.passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-nurse-silver-400">
              {results.passed ? 'You passed the practice test!' : 'Review the explanations and try again.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-4xl font-bold text-nurse-red-400">{results.score}%</div>
              <div className="text-sm text-nurse-silver-400 mt-1">Score</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-4xl font-bold text-green-400">{results.correctCount}/{results.totalQuestions}</div>
              <div className="text-sm text-nurse-silver-400 mt-1">Correct</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-4xl font-bold text-blue-400">{results.earnedPoints}/{results.totalPoints}</div>
              <div className="text-sm text-nurse-silver-400 mt-1">Points</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { setResults(null); setAnswers({}); setShowExplanations(false); }}
              className="flex-1 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-glow-red"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition border border-white/10"
            >
              Back to Course
            </button>
          </div>
        </div>

        {/* Review Questions */}
        {showExplanations && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Review & Explanations</h3>
            {questions.map((q, idx) => {
              const result = results.results.find((r: any) => r.questionId === q.id);
              const options = safeJsonParse(q.options, []);
              return (
                <div key={q.id} className={`bg-white/5 backdrop-blur-xl border rounded-xl p-6 ${result?.isCorrect ? 'border-green-500/30' : 'border-red-500/30'
                  }`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`mt-1 ${result?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {result?.isCorrect ? <CheckCircle size={24} /> : <XCircle size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-nurse-silver-400 mb-2">Question {idx + 1}</div>
                      <div className="text-white font-medium mb-4">{q.question}</div>

                      {options.map((opt: any) => (
                        <div key={opt.id} className={`p-3 rounded-lg mb-2 ${opt.id === result?.correctAnswer ? 'bg-green-500/20 border border-green-500/30' :
                            opt.id === answers[q.id] && !result?.isCorrect ? 'bg-red-500/20 border border-red-500/30' :
                              'bg-white/5'
                          }`}>
                          <span className="text-nurse-silver-300">{opt.id}) {opt.text}</span>
                          {opt.id === result?.correctAnswer && <span className="ml-2 text-green-400 text-sm">✓ Correct</span>}
                        </div>
                      ))}

                      {q.explanation && (
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="text-sm font-bold text-blue-300 mb-2">Explanation:</div>
                          <div className="text-sm text-nurse-silver-300">{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quiz Bank - Practice Test</h1>
            <p className="text-nurse-silver-400">{questions.length} Questions</p>
          </div>
          <div className="flex items-center gap-2 text-nurse-silver-400">
            <Clock size={20} />
            <span className="text-sm">Untimed</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const options = safeJsonParse(q.options, []);
          const isMultipleChoice = q.type === 'multiple_choice';

          return (
            <div key={q.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-gradient-to-r from-nurse-red-600 to-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium mb-4">{q.question}</div>

                  <div className="space-y-2">
                    {options.map((opt: any) => (
                      <label
                        key={opt.id}
                        className={`flex items-center p-4 rounded-lg cursor-pointer transition ${answers[q.id] === opt.id
                            ? 'bg-nurse-red-600/30 border-2 border-nurse-red-500'
                            : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                          }`}
                      >
                        <input
                          type={isMultipleChoice ? 'radio' : 'checkbox'}
                          name={`question-${q.id}`}
                          checked={answers[q.id] === opt.id}
                          onChange={() => handleAnswerChange(q.id, opt.id)}
                          className="mr-3"
                        />
                        <span className="text-nurse-silver-300">{opt.id}) {opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Footer */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="text-nurse-silver-400 text-sm">
            Answered: {Object.keys(answers).length} / {questions.length}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(answers).length === 0}
              className="px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-glow-red"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Award size={20} />
                  Submit Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
