'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface QBank {
  id: number;
  name: string;
  description: string | null;
  instructor: string | null;
  thumbnail: string | null;
  pricing: number;
  totalQuestions: number | null;
  courseId: number | null;
  accessStatus: 'enrolled' | 'requested' | 'available' | 'requestable' | 'locked';
  enrollment?: any;
  request?: any;
}

interface QBanksData {
  enrolled: QBank[];
  requested: QBank[];
  available: QBank[];
  locked: QBank[];
}

export default function QBanksPage() {
  const [activeTab, setActiveTab] = useState<'enrolled' | 'requested' | 'available' | 'locked'>('enrolled');
  const [error, setError] = useState('');
  const router = useRouter();
  const queryClient = useQueryClient();

  // ⚡ PERFORMANCE: Use React Query for Q-Banks with caching
  const { data: qbanks = { enrolled: [], requested: [], available: [], locked: [] }, isLoading: loading, refetch } = useQuery<QBanksData>({
    queryKey: ['student-qbanks'],
    queryFn: async () => {
      const response = await fetch('/api/student/qbanks', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Q-Banks');
      }

      console.log('⚡ Student Q-Banks loaded and cached');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - fast navigation back
  });

  const handleEnroll = async (qbankId: number) => {
    console.log('Enrolling in Q-Bank:', qbankId);
    try {
      const response = await fetch(`/api/student/qbanks/${qbankId}/enroll`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Enroll response status:', response.status);
      const data = await response.json();
      console.log('Enroll response data:', data);

      if (response.ok) {
        // ⚡ Invalidate cache to refresh Q-Banks list
        queryClient.invalidateQueries({ queryKey: ['student-qbanks'] });
      } else {
        if (data.requiresApproval) {
          router.push(`/student/qbanks/${qbankId}?request=true`);
        } else {
          alert(data.message || 'Failed to enroll');
        }
      }
    } catch (err: any) {
      console.error('Enroll error:', err);
      alert('Failed to enroll: ' + err.message);
    }
  };

  const renderQBankCard = (qbank: QBank) => {
    const progress = qbank.enrollment?.progress || 0;
    const readinessScore = qbank.enrollment?.readinessScore || 0;

    return (
      <div
        key={qbank.id}
        className="bg-white/5 backdrop-blur-xl rounded-xl shadow-dark-lg hover:shadow-glow-red transition-all p-6 border border-white/10 hover:border-nurse-red-500/30"
      >
        {qbank.thumbnail && (
          <div className={`w-full h-48 bg-slate-800 rounded-lg mb-4 overflow-hidden relative ${qbank.accessStatus === 'locked' ? 'opacity-60' : ''
            }`}>
            <img
              src={qbank.thumbnail}
              alt={qbank.name}
              className="w-full h-full object-cover"
            />
            {qbank.accessStatus === 'locked' && (
              <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-300">Locked</p>
                </div>
              </div>
            )}
          </div>
        )}

        <h3 className="text-xl font-bold text-white mb-2">{qbank.name}</h3>
        {qbank.description && (
          <p className="text-nurse-silver-400 text-sm mb-4 line-clamp-2">{qbank.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-nurse-silver-500 mb-4">
          {qbank.instructor && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {qbank.instructor}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {qbank.totalQuestions || 0} questions
          </span>
        </div>

        {qbank.accessStatus === 'enrolled' && (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-nurse-silver-400">Progress</span>
                <span className="font-semibold text-white">{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-nurse-red-500 to-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {readinessScore > 0 && (
              <div className="mb-4 p-3 bg-nurse-red-500/10 rounded-lg border border-nurse-red-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-nurse-silver-300">Readiness Score</span>
                  <span className={`text-lg font-bold ${readinessScore >= 81 ? 'text-green-400' :
                    readinessScore >= 61 ? 'text-blue-400' :
                      readinessScore >= 51 ? 'text-yellow-400' :
                        readinessScore >= 26 ? 'text-orange-400' :
                          'text-red-400'
                    }`}>
                    {readinessScore}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          {qbank.accessStatus === 'enrolled' && (
            <Link
              href={`/student/qbanks/${qbank.id}`}
              className="flex-1 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors shadow-glow-red"
            >
              Continue
            </Link>
          )}
          {qbank.accessStatus === 'requested' && (
            <button
              disabled
              className="flex-1 bg-nurse-silver-600/50 text-nurse-silver-400 text-center py-2 px-4 rounded-lg font-medium cursor-not-allowed border border-white/10"
            >
              Request Pending
            </button>
          )}
          {qbank.accessStatus === 'available' && (
            <button
              onClick={() => handleEnroll(qbank.id)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Enroll Now
            </button>
          )}
          {qbank.accessStatus === 'requestable' && (
            <Link
              href={`/student/qbanks/${qbank.id}?request=true`}
              className="flex-1 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Request Access
            </Link>
          )}
          {qbank.accessStatus === 'locked' && (
            <button
              disabled
              className="flex-1 bg-slate-700/50 text-slate-400 text-center py-2 px-4 rounded-lg font-medium cursor-not-allowed border border-slate-600/50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500 mx-auto"></div>
            <p className="mt-4 text-nurse-silver-400">Loading Q-Banks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Question Banks</h1>
        <p className="text-nurse-silver-400">Practice with comprehensive NCLEX-style questions</p>
      </div>

      {/* Tabs - Dark Theme */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'enrolled'
            ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
            : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Enrolled ({qbanks.enrolled.length})
        </button>
        <button
          onClick={() => setActiveTab('requested')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'requested'
            ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
            : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Requested ({qbanks.requested.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'available'
            ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
            : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Available ({qbanks.available.length})
        </button>
        <button
          onClick={() => setActiveTab('locked')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'locked'
            ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
            : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Locked ({qbanks.locked.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Q-Bank Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'enrolled' && qbanks.enrolled.map(renderQBankCard)}
        {activeTab === 'requested' && qbanks.requested.map(renderQBankCard)}
        {activeTab === 'available' && qbanks.available.map(renderQBankCard)}
        {activeTab === 'locked' && qbanks.locked.map(renderQBankCard)}
      </div>

      {activeTab === 'enrolled' && qbanks.enrolled.length === 0 && (
        <div className="text-center py-12 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-nurse-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-nurse-red-500/20">
            <svg className="w-8 h-8 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-nurse-silver-400">No enrolled Q-Banks yet. Check the Available tab to get started!</p>
        </div>
      )}

      {activeTab === 'requested' && qbanks.requested.length === 0 && (
        <div className="text-center py-12 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-nurse-silver-400">No pending requests.</p>
        </div>
      )}

      {activeTab === 'available' && qbanks.available.length === 0 && (
        <div className="text-center py-12 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-nurse-silver-400">No available Q-Banks at the moment.</p>
        </div>
      )}

      {activeTab === 'locked' && qbanks.locked.length === 0 && (
        <div className="text-center py-12 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-500/20">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-nurse-silver-400">No locked Q-Banks at the moment.</p>
        </div>
      )}
    </div>
  );
}
