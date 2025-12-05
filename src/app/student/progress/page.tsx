'use client';

import { useMemo, useState, useEffect } from 'react';
import LoadingSpinner from '@/components/student/LoadingSpinner';
import { syncClient } from '@/lib/sync-client';

type ProgressItem = {
  courseId: string;
  course: {
    id: string;
    title: string;
    description: string;
    instructor: string;
    thumbnail: string | null;
  };
  totalProgress: number;
  completedModules: number;
  completedQuizzes: number;
  watchedVideos: number;
  lastAccessed: string;
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/student/progress-details', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 [Progress Page] Received progress data:', data);
        console.log('📊 [Progress Page] Progress items count:', data.progress?.length || 0);
        setProgress(data.progress || []);
      } else {
        const errorText = await response.text();
        console.error('❌ [Progress Page] Failed to fetch progress:', response.status, errorText);
        setProgress([]);
      }
    } catch (error) {
      console.error('❌ [Progress Page] Error fetching progress:', error);
      setProgress([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();

    // Start sync client for auto-updates
    syncClient.start();
    syncClient.on('sync', (syncData: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [Progress Page] Sync update received:', syncData);
      }
      // Refresh progress when sync update is received
      fetchProgress();
    });

    // Refresh progress when page comes into focus
    const handleFocus = () => {
      fetchProgress();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      syncClient.off('sync', fetchProgress);
      syncClient.stop();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return progress.filter((r) => r.course.title.toLowerCase().includes(q));
  }, [progress, query]);

  if (isLoading) {
    return <LoadingSpinner message="Loading your progress..." fullScreen />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
          <p className="mt-2 text-gray-600">Track your learning journey across courses</p>
        </div>
        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.courseId}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{item.course.title}</h3>
                <span className="text-sm font-semibold text-purple-600">{item.totalProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.totalProgress, 0)}%` }}
                />
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  Completed modules:{' '}
                  <span className="font-semibold">{item.completedModules || 0}</span>
                </p>
                <p>
                  Completed quizzes:{' '}
                  <span className="font-semibold">{item.completedQuizzes || 0}</span>
                </p>
                <p>
                  Watched videos: <span className="font-semibold">{item.watchedVideos || 0}</span>
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Last accessed: {new Date(item.lastAccessed).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No progress yet</h3>
          <p className="text-gray-600">Start enrolling in courses to track your progress here</p>
        </div>
      )}
    </div>
  );
}
