'use client';

import { useState } from 'react';
import { getDailyVideos } from '@/lib/data';

export default function DailyVideoPage() {
  const [daily] = useState(getDailyVideos());
  const today = daily.find(d => !d.isCompleted) || daily[0];
  const [completed, setCompleted] = useState(!!today?.isCompleted);

  if (!today) {
    return <div className="bg-white rounded-2xl p-8">No daily videos configured.</div>;
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
          <iframe className="w-full h-full" src={today.url} title={today.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Provider: {today.provider.toUpperCase()}</div>
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
