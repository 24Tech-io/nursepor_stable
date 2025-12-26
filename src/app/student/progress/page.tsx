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
    
    // TEMP DISABLED: Causing excessive requests`r`n
    
    // syncClient.start();
    syncClient.on('sync', (syncData: any) => {
      console.log('🔄 [Progress Page] Sync update received:', syncData);
      fetchProgress();
    });
    
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Progress</h1>
          <p className="mt-2 text-nurse-silver-400">Track your learning journey across courses</p>
        </div>
        <div className="w-full md:max-w-md">
          <input 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
            placeholder="Search course" 
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-nurse-red-500 focus:border-transparent text-white placeholder-nurse-silver-500 backdrop-blur-xl" 
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <div key={item.courseId} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">{item.course.title}</h3>
                <span className="text-sm font-semibold text-nurse-red-400">{item.totalProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-nurse-red-500 to-red-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(item.totalProgress, 0)}%` }} 
                />
              </div>
              <div className="text-sm text-nurse-silver-400 space-y-1">
                <p>Completed modules: <span className="font-semibold text-white">{item.completedModules || 0}</span></p>
                <p>Completed quizzes: <span className="font-semibold text-white">{item.completedQuizzes || 0}</span></p>
                <p>Watched videos: <span className="font-semibold text-white">{item.watchedVideos || 0}</span></p>
                <p className="text-nurse-silver-500 text-xs mt-2">Last accessed: {new Date(item.lastAccessed).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 text-center">
          <div className="w-20 h-20 bg-nurse-silver-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-silver-500/20">
            <svg className="w-10 h-10 text-nurse-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No progress yet</h3>
          <p className="text-nurse-silver-400">Start enrolling in courses to track your progress here</p>
        </div>
      )}
    </div>
  );
}
