'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award, TrendingUp } from 'lucide-react';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

interface QuizResult {
    score: number;
    maxScore: number;
    percentage: string;
    passed: boolean;
}

interface QuizAttempt {
    id: number;
    testId: string;
    title: string;
    score: number;
    maxScore: number;
    percentage: number;
    status: string;
    completedAt: string;
}

export default function QuizResultsPage() {
    const params = useParams();
    const router = useRouter();
    const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchQuizHistory();
        
        // Start sync client for real-time updates
        // TEMP DISABLED: Causing excessive requests`r`n
        // syncClient.start();
        const handleSync = () => {
            fetchQuizHistory();
        };
        syncClient.on('sync', handleSync);
        
        return () => {
            syncClient.off('sync', handleSync);
            syncClient.stop();
        };
    }, []);

    const fetchQuizHistory = async () => {
        try {
            // Use unified analysis API
            const response = await fetch('/api/analysis/quiz-history', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                // Transform unified format to match existing interface
                const transformedHistory = (data.attempts || []).map((attempt: any) => ({
                    id: attempt.id,
                    testId: attempt.id.toString(),
                    title: attempt.title || (attempt.type === 'qbank' ? 'Q-Bank Test' : 'Course Quiz'),
                    score: attempt.correctCount || attempt.correctAnswers || 0,
                    maxScore: attempt.questionCount || attempt.totalQuestions || 0,
                    percentage: attempt.percentage || 0,
                    status: 'completed',
                    completedAt: attempt.completedAt || attempt.startedAt,
                    type: attempt.type,
                    courseTitle: attempt.courseTitle,
                }));
                setQuizHistory(transformedHistory);
            }
        } catch (error) {
            console.error('Error fetching quiz history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getGrade = (percentage: number) => {
        if (percentage >= 90) return { grade: 'A', color: 'text-green-600 bg-green-100' };
        if (percentage >= 80) return { grade: 'B', color: 'text-blue-600 bg-blue-100' };
        if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' };
        if (percentage >= 60) return { grade: 'D', color: 'text-orange-600 bg-orange-100' };
        return { grade: 'F', color: 'text-red-600 bg-red-100' };
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading quiz results..." fullScreen />;
    }

    const completedQuizzes = quizHistory.filter(q => q.status === 'completed');
    const avgScore = completedQuizzes.length > 0
        ? completedQuizzes.reduce((sum, q) => sum + q.percentage, 0) / completedQuizzes.length
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz History & Results</h1>
                    <p className="text-gray-600">Track your quiz performance and progress</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Award className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Quizzes</p>
                                <p className="text-2xl font-bold text-gray-900">{completedQuizzes.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="text-green-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Passed</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {completedQuizzes.filter(q => q.percentage >= 70).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Average Score</p>
                                <p className="text-2xl font-bold text-gray-900">{avgScore.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Award className="text-yellow-600" size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Best Score</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {completedQuizzes.length > 0 ? Math.max(...completedQuizzes.map(q => q.percentage)).toFixed(0) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quiz List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Your Quiz Attempts</h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {completedQuizzes.length === 0 ? (
                            <div className="p-12 text-center">
                                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-600">No completed quizzes yet</p>
                                <button
                                    onClick={() => router.push('/student/courses')}
                                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                                >
                                    Start Learning
                                </button>
                            </div>
                        ) : (
                            completedQuizzes.map((quiz) => {
                                const gradeInfo = getGrade(quiz.percentage);
                                const passed = quiz.percentage >= 70;

                                return (
                                    <div key={quiz.id} className="p-6 hover:bg-gray-50 transition">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">{quiz.title}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={16} />
                                                        {new Date(quiz.completedAt).toLocaleDateString()}
                                                    </span>
                                                    <span>
                                                        Score: {quiz.score}/{quiz.maxScore}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Grade Badge */}
                                                <div className={`px-4 py-2 rounded-xl font-bold text-lg ${gradeInfo.color}`}>
                                                    {gradeInfo.grade}
                                                </div>

                                                {/* Percentage Circle */}
                                                <div className="relative w-20 h-20">
                                                    <svg className="transform -rotate-90 w-20 h-20">
                                                        <circle
                                                            cx="40"
                                                            cy="40"
                                                            r="32"
                                                            stroke="currentColor"
                                                            strokeWidth="8"
                                                            fill="none"
                                                            className="text-gray-200"
                                                        />
                                                        <circle
                                                            cx="40"
                                                            cy="40"
                                                            r="32"
                                                            stroke="currentColor"
                                                            strokeWidth="8"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 32}`}
                                                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - quiz.percentage / 100)}`}
                                                            className={passed ? 'text-green-500' : 'text-red-500'}
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-gray-900">{quiz.percentage.toFixed(0)}%</span>
                                                    </div>
                                                </div>

                                                {/* Pass/Fail Badge */}
                                                <div className="flex items-center gap-2">
                                                    {passed ? (
                                                        <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold">
                                                            <CheckCircle size={20} />
                                                            Passed
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold">
                                                            <XCircle size={20} />
                                                            Failed
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
