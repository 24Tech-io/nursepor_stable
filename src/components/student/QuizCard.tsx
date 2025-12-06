'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MCQQuestion } from '../../lib/types';

interface QuizCardProps {
  questions: MCQQuestion[];
  passMark: number;
  showAnswers: boolean;
  timeLimit?: number;
  quizId?: string;
  onComplete: (score: number, passed: boolean) => void;
}

export default function QuizCard({
  questions,
  passMark,
  showAnswers,
  timeLimit,
  quizId,
  onComplete,
}: QuizCardProps) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null);

  const question = questions[currentQuestion];
  const totalQuestions = questions.length;

  // Define handleSubmit before useEffect
  const handleSubmit = async () => {
    if (isSubmitted) return;

    setIsSubmitted(true);

    // Prepare answers for API: { questionId: answer }
    const answers: Record<string, string> = {};
    questions.forEach((q, index) => {
      if (selectedAnswers[index]) {
        answers[q.id.toString()] = selectedAnswers[index];
      }
    });

    // If quizId is provided, submit to API
    if (quizId) {
      try {
        const response = await fetch(`/api/student/quizzes/${quizId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answers }),
        });

        if (response.ok) {
          const data = await response.json();
          onComplete(data.score, data.passed);
        } else {
          // Fallback to local calculation if API fails
          let correct = 0;
          questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
              correct++;
            }
          });
          const score = (correct / totalQuestions) * 100;
          onComplete(score, score >= passMark);
        }
      } catch (error) {
        console.error('Error submitting quiz:', error);
        // Fallback to local calculation
        let correct = 0;
        questions.forEach((q, index) => {
          if (selectedAnswers[index] === q.correctAnswer) {
            correct++;
          }
        });
        const score = (correct / totalQuestions) * 100;
        onComplete(score, score >= passMark);
      }
    } else {
      // Local calculation
      let correct = 0;
      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correctAnswer) {
          correct++;
        }
      });
      const score = (correct / totalQuestions) * 100;
      onComplete(score, score >= passMark);
    }
  };

  // Timer - Move useEffect BEFORE any early returns
  useEffect(() => {
    if (timeRemaining !== null && !isSubmitted) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeRemaining, isSubmitted, selectedAnswers, questions, totalQuestions, passMark, quizId, onComplete]);

  // ✅ FIX: Safety check for empty questions array - AFTER hooks
  if (totalQuestions === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-6">
          <svg
            className="w-12 h-12 text-yellow-600"
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
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Questions Available</h2>
        <p className="text-gray-600 mb-6">
          This quiz hasn't been set up with questions yet. Please contact your instructor or check
          back later.
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ✅ FIX: Safety check for undefined question (shouldn't happen, but prevent crash)
  if (!question) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading question...</p>
      </div>
    );
  }

  const handleSelectAnswer = (answer: string) => {
    if (!isSubmitted) {
      setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answer });
    }
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const getScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return (correct / totalQuestions) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isSubmitted) {
    const score = getScore();
    const passed = score >= passMark;

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {passed ? (
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {passed ? 'Congratulations! 🎉' : 'Keep Trying! 💪'}
        </h2>
        <p className="text-gray-600 mb-6">
          {passed ? "You've passed the quiz!" : "You didn't pass this time."}
        </p>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="text-5xl font-bold text-gray-900 mb-2">{score.toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Your Score</div>
          <div className="mt-4 text-sm text-gray-500">
            Pass Mark: {passMark}% | You got{' '}
            {questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length}/
            {totalQuestions} correct
          </div>
        </div>

        {showAnswers && (
          <div className="space-y-4 mb-6 text-left">
            <h3 className="font-bold text-gray-900 text-lg">Review Answers</h3>
            {questions.map((q, index) => {
              const isCorrect = selectedAnswers[index] === q.correctAnswer;
              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <p className="font-semibold text-gray-900 mb-2">
                    {index + 1}. {q.question}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Your answer:{' '}
                    <span
                      className={
                        isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
                      }
                    >
                      {q.options[selectedAnswers[index]] || selectedAnswers[index]}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-green-600 font-semibold mb-2">
                      Correct answer: {q.options[q.correctAnswer] || q.correctAnswer}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 italic">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => {
            // Reset quiz state instead of full page reload
            setCurrentQuestion(0);
            setSelectedAnswers({});
            setIsSubmitted(false);
            setTimeRemaining(timeLimit ? timeLimit * 60 : null);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              Question {currentQuestion + 1} of {totalQuestions}
            </h3>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mt-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          {timeRemaining !== null && (
            <div className="text-right">
              <div className="text-sm opacity-90">Time Left</div>
              <div className="text-2xl font-bold">{formatTime(timeRemaining)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{question.question}</h2>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {Object.entries(question.options).map(([key, value]) => {
            const isSelected = selectedAnswers[currentQuestion] === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectAnswer(key)}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                      isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 mr-3">{parseInt(key) + 1}.</span>
                    <span className="text-gray-700">{value}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          {currentQuestion === totalQuestions - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== totalQuestions}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-md"
            >
              Next →
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex justify-center space-x-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-purple-600 w-8'
                  : selectedAnswers[index]
                    ? 'bg-green-400'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
