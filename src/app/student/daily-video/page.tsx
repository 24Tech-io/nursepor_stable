'use client';

import { useState, useEffect } from 'react';

export default function DailyVideoPage() {
  const [todayVideo, setTodayVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchDailyVideo();
  }, []);

  const fetchDailyVideo = async () => {
    try {
      const response = await fetch('/api/student/daily-video', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTodayVideo(data.dailyVideo);
      } else if (response.status === 403) {
        // Student is not active or no video available
        setTodayVideo(null);
      }
    } catch (error) {
      console.error('Error fetching daily video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const today = todayVideo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading today's video...</p>
        </div>
      </div>
    );
  }

  if (!today) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Daily Video Today</h2>
        <p className="text-gray-600">Check back tomorrow for new content!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{today.title}</h1>
            <p className="text-gray-600">Available for 24 hours · {today.duration} min</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{completed ? 'Completed' : 'In Progress'}</span>
        </div>
          <div className="aspect-video w-full bg-black">
          <iframe 
            className="w-full h-full" 
            src={today.videoUrl} 
            title={today.title} 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Provider: {today.videoProvider?.toUpperCase() || 'VIDEO'}</div>
          <button onClick={() => setCompleted(true)} disabled={completed} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50">{completed ? 'Completed' : 'Mark as Complete'}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {daily.map(item => (
            <div key={item.id} className="p-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600">Day {item.day} · {item.duration} min</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{item.isCompleted ? 'Completed' : 'Pending'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
