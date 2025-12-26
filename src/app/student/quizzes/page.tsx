'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award, BookOpen, Play } from 'lucide-react';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

interface Quiz {
  id: number;
  title: string;
  passMark: number;
  timeLimit: number | null;
  maxAttempts: number;
  chapterId: number;
  chapterTitle: string;
  moduleTitle: string;
  courseId: number;
  courseTitle: string;
  attemptCount: number;
  latestAttempt: {
    score: number;
    totalQuestions: number;
    percentage: number;
    passed: boolean;
    attemptedAt: string;
  } | null;
  canRetake: boolean;
}

export default function QuizzesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'available' | 'pending' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<{
    available: Quiz[];
    pending: Quiz[];
    completed: Quiz[];
  }>({
    available: [],
    pending: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
    
    // Start sync client for real-time updates
    // TEMP DISABLED: Causing excessive requests`r`n
    // syncClient.start();
    const handleSync = () => {
      fetchQuizzes();
    };
    syncClient.on('sync', handleSync);
    
    return () => {
      syncClient.off('sync', handleSync);
      syncClient.stop();
    };
  }, []);

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/quizzes', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes({
          available: data.available || [],
          pending: data.pending || [],
          completed: data.completed || [],
        });
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (quizId: number) => {
    router.push(`/student/quizzes/${quizId}`);
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600 bg-green-100' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600 bg-orange-100' };
    return { grade: 'F', color: 'text-red-600 bg-red-100' };
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading quizzes..." fullScreen />;
  }

  const currentQuizzes = quizzes[activeTab] || [];
  const totalQuizzes = quizzes.available.length + quizzes.pending.length + quizzes.completed.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Quizzes</h1>
          <p className="text-slate-400">Access and track all your course quizzes</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BookOpen className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Quizzes</p>
                <p className="text-2xl font-bold text-white">{totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Play className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Available</p>
                <p className="text-2xl font-bold text-white">{quizzes.available.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{quizzes.pending.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-white">{quizzes.completed.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg border border-white/10 mb-6">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'available'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Available ({quizzes.available.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In Progress ({quizzes.pending.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed ({quizzes.completed.length})
            </button>
          </div>
        </div>

        {/* Quiz List */}
        <div className="space-y-4">
          {currentQuizzes.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-12 text-center border border-white/10">
              <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-slate-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {activeTab === 'available' && 'No Available Quizzes'}
                {activeTab === 'pending' && 'No Quizzes In Progress'}
                {activeTab === 'completed' && 'No Completed Quizzes'}
              </h3>
              <p className="text-slate-400">
                {activeTab === 'available' && 'Complete course chapters to unlock quizzes'}
                {activeTab === 'pending' && 'You have no quizzes in progress'}
                {activeTab === 'completed' && 'You haven\'t completed any quizzes yet'}
              </p>
            </div>
          ) : (
            currentQuizzes.map((quiz) => {
              const gradeInfo = quiz.latestAttempt 
                ? getGrade(quiz.latestAttempt.percentage)
                : null;
              const passed = quiz.latestAttempt?.passed || false;

              return (
                <div
                  key={quiz.id}
                  className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-dark-lg p-6 border border-white/10 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{quiz.title}</h3>
                        {quiz.latestAttempt && (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {passed ? 'Passed' : 'Failed'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <BookOpen size={16} />
                          {quiz.courseTitle}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award size={16} />
                          {quiz.moduleTitle} - {quiz.chapterTitle}
                        </span>
                        {quiz.timeLimit && (
                          <span className="flex items-center gap-1">
                            <Clock size={16} />
                            {quiz.timeLimit} min
                          </span>
                        )}
                      </div>
                      {quiz.latestAttempt && (
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Score:</span>
                            <span className="text-lg font-bold text-white">
                              {quiz.latestAttempt.score}/{quiz.latestAttempt.totalQuestions}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Percentage:</span>
                            <span className={`text-lg font-bold ${
                              passed ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {quiz.latestAttempt.percentage}%
                            </span>
                          </div>
                          {gradeInfo && (
                            <div className={`px-3 py-1 rounded-lg font-bold text-sm ${gradeInfo.color}`}>
                              Grade: {gradeInfo.grade}
                            </div>
                          )}
                          <div className="text-sm text-slate-500">
                            Attempts: {quiz.attemptCount}/{quiz.maxAttempts || '∞'}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        Pass Mark: {quiz.passMark}% | Max Attempts: {quiz.maxAttempts || 'Unlimited'}
                      </div>
                    </div>

                    <div className="ml-6">
                      {quiz.latestAttempt && passed && !quiz.canRetake ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl font-semibold">
                          <CheckCircle size={20} />
                          Completed
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartQuiz(quiz.id)}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                          <Play size={20} />
                          {quiz.latestAttempt ? 'Retake Quiz' : 'Start Quiz'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
