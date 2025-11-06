"use client";

import { useMemo, useState } from 'react';
import { getAccessRequests } from '@/lib/data';

type Request = ReturnType<typeof getAccessRequests>[number];

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>(getAccessRequests());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return requests.filter(r => {
      const matchesQ = [r.studentName, r.courseTitle, r.reason].some(v => v?.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [requests, query, statusFilter]);

  function updateRequest(id: string, next: 'approved' | 'rejected') {
    setRequests(requests.map(r => r.id === id ? { ...r, status: next, reviewedAt: new Date(), reviewedBy: 'Admin' } : r));
  }

  function removeRequest(id: string) {
    if (confirm('Delete this request?')) setRequests(requests.filter(r => r.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Access Requests</h1>
          <p className="mt-2 text-gray-600">Review and approve/deny student requests</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by student, course or reason" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
        </div>
        <div className="flex items-center gap-2">
          {(['all','pending','approved','rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-xl text-sm font-semibold ${statusFilter===s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s[0].toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{r.studentName}</div>
                  <div className="text-sm text-gray-600">{r.studentId}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{r.courseTitle}</div>
                  <div className="text-sm text-gray-600">{r.courseId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 max-w-xl">{r.reason}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.status==='pending'?'bg-yellow-100 text-yellow-700': r.status==='approved'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.status}</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {r.status==='pending' && (
                    <>
                      <button onClick={() => updateRequest(r.id,'approved')} className="text-green-600 hover:text-green-700 font-medium">Approve</button>
                      <button onClick={() => updateRequest(r.id,'rejected')} className="text-red-600 hover:text-red-700 font-medium">Deny</button>
                    </>
                  )}
                  <button onClick={() => removeRequest(r.id)} className="text-gray-600 hover:text-gray-800 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
