'use client';

import { useState, useEffect } from 'react';
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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null);

  const question = questions[currentQuestion];
  const totalQuestions = questions.length;

  // Timer
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
  }, [timeRemaining, isSubmitted]);

  const handleSelectAnswer = (answer: string) => {
    if (!isSubmitted) {
      setSelectedAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
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
      // Local calculation if no quizId
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
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-8 text-center backdrop-blur-sm">
        <div
          className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 border-2 ${passed ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'
            }`}
        >
          {passed ? (
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">
          {passed ? 'Congratulations! 🎉' : 'Keep Trying! 💪'}
        </h2>
        <p className="text-gray-300 mb-6">
          {passed ? "You've passed the quiz!" : "You didn't pass this time."}
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="text-5xl font-bold text-white mb-2">{score.toFixed(0)}%</div>
          <div className="text-sm text-gray-400 uppercase tracking-wider font-medium">Your Score</div>
          <div className="mt-4 text-sm text-gray-400">
            Pass Mark: <span className="text-white">{passMark}%</span> | You got <span className="text-white">{questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length}/{totalQuestions}</span> correct
          </div>
        </div>

        {showAnswers && (
          <div className="space-y-4 mb-6 text-left">
            <h3 className="font-bold text-white text-lg">Review Answers</h3>
            {questions.map((q, index) => {
              const isCorrect = selectedAnswers[index] === q.correctAnswer;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-500/30 bg-green-900/10' : 'border-red-500/30 bg-red-900/10'}`}>
                  <p className="font-semibold text-white mb-2">
                    <span className="text-gray-400 mr-2">{index + 1}.</span> {q.question}
                  </p>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-gray-300">
                      Your answer: <span className={isCorrect ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{selectedAnswers[index]}</span>
                    </p>
                    {!isCorrect && (
                      <p className="text-green-400 font-semibold">
                        Correct answer: {q.correctAnswer}
                      </p>
                    )}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-sm text-gray-400 italic">
                        <span className="font-semibold text-gray-500 not-italic mr-1">Explanation:</span>
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => {
            // Reset quiz state instead of reloading page
            setCurrentQuestion(0);
            setSelectedAnswers({});
            setIsSubmitted(false);
            setTimeRemaining(timeLimit ? timeLimit * 60 : null);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transition shadow-lg shadow-purple-900/20"
        >
          Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 text-white border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="w-full mr-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <span className="text-purple-400">Question {currentQuestion + 1}</span>
              <span className="text-gray-400 text-sm font-normal">of {totalQuestions}</span>
            </h3>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          {timeRemaining !== null && (
            <div className="text-right whitespace-nowrap bg-black/20 px-4 py-2 rounded-lg border border-white/5">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Time Left</div>
              <div className={`text-xl font-bold font-mono ${timeRemaining < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{question?.question || 'Question unavailable'}</h2>

        {/* Options */}
        <div className="space-y-4 mb-8">
          {(() => {
            const opts: any = question?.options;

            // QBank/custom can provide options as arrays; legacy provides a Record.
            if (Array.isArray(opts)) {
              return opts.map((opt: any, idx: number) => {
                const key = opt?.id !== null && opt?.id !== undefined ? String(opt.id) : String(idx);
                const label = String.fromCharCode(65 + idx);
                const value = typeof opt === 'string' ? opt : (opt?.text !== null && opt?.text !== undefined ? String(opt.text) : String(opt));
                const isSelected = selectedAnswers[currentQuestion] === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-200 group ${isSelected
                      ? 'border-purple-500 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${isSelected ? 'border-purple-500 bg-purple-600 text-white' : 'border-gray-600 text-gray-400 group-hover:border-purple-400 group-hover:text-purple-400'
                          }`}
                      >
                        {isSelected ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        ) : (
                          <span className="font-bold text-sm">{label}</span>
                        )}
                      </div>
                      <div>
                        <span className={`text-lg ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{value}</span>
                      </div>
                    </div>
                  </button>
                );
              });
            }

            return Object.entries(opts || {}).map(([key, value]) => {
              const isSelected = selectedAnswers[currentQuestion] === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectAnswer(key)}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-200 group ${isSelected
                    ? 'border-purple-500 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${isSelected ? 'border-purple-500 bg-purple-600 text-white' : 'border-gray-600 text-gray-400 group-hover:border-purple-400 group-hover:text-purple-400'
                        }`}
                    >
                      {isSelected ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      ) : (
                        <span className="font-bold text-sm">{key}</span>
                      )}
                    </div>
                    <div>
                      <span className={`text-lg ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{String(value)}</span>
                    </div>
                  </div>
                </button>
              );
            });
          })()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 border border-white/20 rounded-xl font-semibold text-gray-300 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            ← Previous
          </button>

          {currentQuestion === totalQuestions - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== totalQuestions}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-green-900/20 flex items-center gap-2"
            >
              Submit Quiz
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-900/20 flex items-center gap-2"
            >
              Next →
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center space-x-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentQuestion
                ? 'bg-purple-500 w-8'
                : selectedAnswers[index]
                  ? 'bg-green-500 w-2'
                  : 'bg-white/10 w-2'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
