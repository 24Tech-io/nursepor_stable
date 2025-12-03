'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft } from 'lucide-react';

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
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm(`You've only answered ${Object.keys(answers).length} out of ${questions.length} questions. Submit anyway?`)) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Course
          </button>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Practice Questions Yet</h2>
            <p className="text-slate-400">Your instructor hasn't added Q-Bank questions to this course yet.</p>
          </div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-6">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                results.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {results.passed ? <CheckCircle size={40} /> : <XCircle size={40} />}
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {results.passed ? 'Congratulations!' : 'Keep Practicing!'}
              </h2>
              <p className="text-slate-400">
                {results.passed ? 'You passed the practice test!' : 'Review the explanations and try again.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-purple-400">{results.score}%</div>
                <div className="text-sm text-slate-400 mt-1">Score</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-green-400">{results.correctCount}/{results.totalQuestions}</div>
                <div className="text-sm text-slate-400 mt-1">Correct</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-blue-400">{results.earnedPoints}/{results.totalPoints}</div>
                <div className="text-sm text-slate-400 mt-1">Points</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setResults(null); setAnswers({}); setShowExplanations(false); }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-bold transition"
              >
                Try Again
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition"
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
                  <div key={q.id} className={`bg-slate-800/50 border rounded-xl p-6 ${
                    result?.isCorrect ? 'border-green-500/30' : 'border-red-500/30'
                  }`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`mt-1 ${result?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {result?.isCorrect ? <CheckCircle size={24} /> : <XCircle size={24} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-400 mb-2">Question {idx + 1}</div>
                        <div className="text-white font-medium mb-4">{q.question}</div>
                        
                        {options.map((opt: any) => (
                          <div key={opt.id} className={`p-3 rounded-lg mb-2 ${
                            opt.id === result?.correctAnswer ? 'bg-green-500/20 border border-green-500/30' :
                            opt.id === answers[q.id] && !result?.isCorrect ? 'bg-red-500/20 border border-red-500/30' :
                            'bg-slate-900/50'
                          }`}>
                            <span className="text-slate-300">{opt.id}) {opt.text}</span>
                            {opt.id === result?.correctAnswer && <span className="ml-2 text-green-400 text-sm">✓ Correct</span>}
                          </div>
                        ))}

                        {q.explanation && (
                          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="text-sm font-bold text-blue-300 mb-2">Explanation:</div>
                            <div className="text-sm text-slate-300">{q.explanation}</div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Course Practice Test</h1>
              <p className="text-slate-400">{questions.length} Questions</p>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <Clock size={20} />
              <span className="text-sm">Untimed</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const options = safeJsonParse(q.options, []);
            const isMultipleChoice = q.type === 'multiple_choice';

            return (
              <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium mb-4">{q.question}</div>
                    
                    <div className="space-y-2">
                      {options.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`flex items-center p-4 rounded-lg cursor-pointer transition ${
                            answers[q.id] === opt.id
                              ? 'bg-purple-600/30 border-2 border-purple-500'
                              : 'bg-slate-900/50 border-2 border-transparent hover:border-slate-700'
                          }`}
                        >
                          <input
                            type={isMultipleChoice ? 'radio' : 'checkbox'}
                            name={`question-${q.id}`}
                            checked={answers[q.id] === opt.id}
                            onChange={() => handleAnswerChange(q.id, opt.id)}
                            className="mr-3"
                          />
                          <span className="text-slate-300">{opt.id}) {opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-6 mt-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-slate-400 text-sm">
              Answered: {Object.keys(answers).length} / {questions.length}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(answers).length === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </div>
  );
}
