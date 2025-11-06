'use client';

import { useMemo, useState } from 'react';
import { getCourses, getStudentProgress } from '@/lib/data';

export default function ProgressPage() {
  const studentId = '1';
  const courses = getCourses();
  const [query, setQuery] = useState('');
  const progress = getStudentProgress(studentId);

  const merged = useMemo(() => {
    return progress.map(p => ({
      ...p,
      course: courses.find(c => c.id === p.courseId)!
    })).filter(Boolean);
  }, [progress, courses]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return merged.filter(r => r.course.title.toLowerCase().includes(q));
  }, [merged, query]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
          <p className="mt-2 text-gray-600">Track your learning journey across courses</p>
        </div>
        <div className="w-full max-w-md">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search course" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.courseId} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">{item.course.title}</h3>
              <span className="text-sm text-gray-600">{item.totalProgress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${item.totalProgress}%` }} />
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Completed modules: {item.completedModules?.length || 0}</p>
              <p>Completed quizzes: {item.completedQuizzes?.length || 0}</p>
              <p>Watched videos: {item.watchedVideos?.length || 0}</p>
              <p className="text-gray-500">Last accessed: {item.lastAccessed.toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




