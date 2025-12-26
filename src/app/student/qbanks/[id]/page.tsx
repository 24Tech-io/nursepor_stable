'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cachedFetch, invalidateCache, DEFAULT_TTL } from '@/lib/data-cache';

type Tab = 'practice' | 'analytics' | 'categories' | 'history';

interface QBank {
  id: number;
  name: string;
  description: string | null;
  instructor: string | null;
  thumbnail: string | null;
  totalQuestions: number;
  accessStatus: string;
  enrollment: any;
}

export default function QBankDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('practice');
  const [qbank, setQbank] = useState<QBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    fetchQBank();
    // Check URL for request parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('request') === 'true') {
      setShowRequestModal(true);
    }
  }, [params.id]);

  const fetchQBank = async () => {
    try {
      setLoading(true);
      const data = await cachedFetch<{
        qbank: QBank;
        accessStatus: string;
        enrollment: any;
      }>(`/api/student/qbanks/${params.id}`, {
        credentials: 'include',
        cacheKey: `qbank-${params.id}`,
        ttl: DEFAULT_TTL.qbank,
      });

      setQbank({
        ...data.qbank,
        accessStatus: data.accessStatus,
        enrollment: data.enrollment,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      const response = await fetch('/api/student/qbank-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          qbankId: parseInt(params.id),
        }),
      });

      if (response.ok) {
        setShowRequestModal(false);
        // Invalidate cache and refresh Q-Bank data without reloading page
        invalidateCache(`qbank-${params.id}`);
        await fetchQBank();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to submit request');
      }
    } catch (err: any) {
      alert('Failed to submit request: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500"></div>
      </div>
    );
  }

  if (error || !qbank) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
            {error || 'Q-Bank not found'}
          </div>
          <Link
            href="/student/qbanks"
            className="mt-4 inline-flex text-nurse-silver-400 hover:text-white transition-colors"
          >
            ← Back to Q-Banks
          </Link>
        </div>
      </div>
    );
  }

  if (!qbank.accessStatus || qbank.accessStatus === 'none' || qbank.accessStatus === 'requestable') {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/student/qbanks"
            className="text-nurse-silver-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors"
          >
            ← Back to Q-Banks
          </Link>
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center shadow-dark-lg">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{qbank.name}</h1>
            <p className="text-nurse-silver-400 mb-8 max-w-lg mx-auto">{qbank.description}</p>
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-6 py-4 rounded-lg mb-8 inline-block">
              <p className="font-medium">Access Required</p>
              <p className="text-sm opacity-80 mt-1">You need to enroll or request access to view this Q-Bank.</p>
            </div>
            <div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white px-8 py-3 rounded-lg font-medium shadow-glow-red transition-all"
              >
                Request Access
              </button>
            </div>
          </div>
        </div>

        {/* Request Access Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Request Access</h2>
              <p className="text-nurse-silver-400 mb-6">{qbank.name}</p>
              <p className="text-nurse-silver-300 mb-6">
                Are you sure you want to request access to this Question Bank? An administrator will review your request.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-3 border border-white/10 rounded-lg text-nurse-silver-300 hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestAccess}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white rounded-lg hover:from-nurse-red-700 hover:to-red-700 transition-colors font-medium shadow-lg"
                >
                  Confirm Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (qbank.accessStatus === 'requested') {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/student/qbanks"
            className="text-nurse-silver-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors"
          >
            ← Back to Q-Banks
          </Link>
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center shadow-dark-lg">
            <h1 className="text-3xl font-bold text-white mb-4">{qbank.name}</h1>
            <p className="text-nurse-silver-400 mb-8 max-w-lg mx-auto">{qbank.description}</p>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-6 py-4 rounded-lg mb-8 inline-block">
              <div className="flex items-center gap-3 mb-2 justify-center">
                <div className="animate-pulse w-2 h-2 bg-amber-400 rounded-full"></div>
                <p className="font-semibold">Request Pending</p>
              </div>
              <p className="text-sm opacity-90">Your access request is currently under review by an administrator.</p>
            </div>
            <div>
              <Link
                href="/student/qbanks"
                className="inline-block bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/student/qbanks"
            className="text-nurse-silver-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors"
          >
            ← Back to Q-Banks
          </Link>
          <div className="flex flex-col md:flex-row items-start gap-8">
            {qbank.thumbnail && (
              <div className="w-full md:w-48 h-32 md:h-32 bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg relative">
                <img src={qbank.thumbnail} alt={qbank.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{qbank.name}</h1>
              {qbank.description && (
                <p className="text-nurse-silver-300 mb-5 max-w-3xl leading-relaxed">{qbank.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-6 text-sm text-nurse-silver-500">
                {qbank.instructor && (
                  <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <svg className="w-4 h-4 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-nurse-silver-300">{qbank.instructor}</span>
                  </span>
                )}
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                  <svg className="w-4 h-4 text-nurse-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-nurse-silver-300">{qbank.totalQuestions} questions</span>
                </span>

                {qbank.enrollment && (
                  <span className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-400 font-medium">Enrolled</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-white/10 mb-8 overflow-x-auto">
          <div className="flex gap-8 min-w-max">
            {(['practice', 'analytics', 'categories', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-medium border-b-2 transition-all capitalize ${activeTab === tab
                  ? 'border-nurse-red-500 text-white'
                  : 'border-transparent text-nurse-silver-500 hover:text-white hover:border-white/30'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'practice' && (
            <PracticeTab qbankId={parseInt(params.id)} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab qbankId={parseInt(params.id)} />
          )}
          {activeTab === 'categories' && (
            <CategoriesTab qbankId={parseInt(params.id)} />
          )}
          {activeTab === 'history' && (
            <HistoryTab qbankId={parseInt(params.id)} />
          )}
        </div>
      </div>
    </div>
  );
}

// Practice Tab Component
function PracticeTab({ qbankId }: { qbankId: number }) {
  const router = useRouter();

  const startTest = (mode: 'tutorial' | 'timed' | 'assessment') => {
    router.push(`/student/qbanks/${qbankId}/test?mode=${mode}`);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Practice Mode</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => startTest('tutorial')}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-800/20 hover:from-blue-600/30 hover:to-blue-800/30 border border-blue-500/20 hover:border-blue-500/40 p-8 rounded-xl text-center transition-all duration-300"
        >
          <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">📚</div>
          <div className="font-bold text-white text-lg mb-2">Tutorial Mode</div>
          <div className="text-sm text-blue-200/70">Learn with immediate feedback and explanations</div>
        </button>
        <button
          onClick={() => startTest('timed')}
          className="group relative overflow-hidden bg-gradient-to-br from-green-600/20 to-green-800/20 hover:from-green-600/30 hover:to-green-800/30 border border-green-500/20 hover:border-green-500/40 p-8 rounded-xl text-center transition-all duration-300"
        >
          <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">⏱️</div>
          <div className="font-bold text-white text-lg mb-2">Timed Mode</div>
          <div className="text-sm text-green-200/70">Practice under exam-like time constraints</div>
        </button>
        <button
          onClick={() => startTest('assessment')}
          className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-800/20 hover:from-purple-600/30 hover:to-purple-800/30 border border-purple-500/20 hover:border-purple-500/40 p-8 rounded-xl text-center transition-all duration-300"
        >
          <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">📊</div>
          <div className="font-bold text-white text-lg mb-2">Assessment Mode</div>
          <div className="text-sm text-purple-200/70">Simulate full exam conditions</div>
        </button>
      </div>
      <div className="border-t border-white/10 pt-6">
        <Link
          href={`/student/qbanks/${qbankId}/test`}
          className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-white/10 hover:border-white/20"
        >
          Custom Test Builder <span className="text-nurse-silver-400">→</span>
        </Link>
      </div>
    </div>
  );
}

// Analytics Tab Component
import AnalyticsDashboard from '@/components/student/AnalyticsDashboard';

function AnalyticsTab({ qbankId }: { qbankId: number }) {
  return (
    <div>
      <AnalyticsDashboard qbankId={qbankId} />
    </div>
  );
}

// Categories Tab Component
function CategoriesTab({ qbankId }: { qbankId: number }) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, [qbankId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/student/qbanks/${qbankId}/categories`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
        <h2 className="text-2xl font-bold text-white mb-8">Categories</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nurse-red-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
        <h2 className="text-2xl font-bold text-white mb-8">Categories</h2>
        <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
          <svg className="w-16 h-16 text-nurse-silver-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-nurse-silver-500">No categories available for this Q-Bank yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Practice by Category</h2>
          <p className="text-nurse-silver-400">Focus your study on specific topics and track your progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category: any) => (
          <div
            key={category.id}
            className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-red"
            style={{ borderTopColor: category.color || '#ef4444', borderTopWidth: '3px' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl bg-white/5 p-2 rounded-lg">{category.icon || '📁'}</div>
              <div className="text-xs font-semibold text-nurse-silver-300 bg-white/10 px-2 py-1 rounded border border-white/5">
                {category.questionCount} Qs
              </div>
            </div>
            <h3 className="font-bold text-lg text-white mb-2 group-hover:text-nurse-red-400 transition-colors">{category.name}</h3>
            {category.description && (
              <p className="text-sm text-nurse-silver-500 mb-6 line-clamp-2 h-10">{category.description}</p>
            )}
            <button
              onClick={() => router.push(`/student/qbanks/${qbankId}/test?category=${category.id}`)}
              className="w-full bg-white/10 group-hover:bg-nurse-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Start Practice
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({ qbankId }: { qbankId: number }) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [qbankId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/student/qbanks/${qbankId}/analytics/test-history`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
        <h2 className="text-2xl font-bold text-white mb-8">Test History</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nurse-red-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-dark-lg">
      <h2 className="text-2xl font-bold text-white mb-8">Test History</h2>
      {tests.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
          <p className="text-nurse-silver-500 text-lg mb-2">No tests completed yet.</p>
          <p className="text-sm text-nurse-silver-600">Your test history and performance stats will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test: any) => (
            <div key={test.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl
                        ${test.score >= 80 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      test.score >= 60 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {test.score >= 80 ? '🏆' : test.score >= 60 ? '👍' : '📝'}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg capitalize">{test.testMode} Test</div>
                    <div className="text-sm text-nurse-silver-500 flex items-center gap-2">
                      <span>📅 {new Date(test.completedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>⏱️ {test.duration || '20'} mins</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${test.score >= 80 ? 'text-green-400' :
                    test.score >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                    {test.score?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-nurse-silver-500">
                    {test.correctCount}/{test.questionCount} correct
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
