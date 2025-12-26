'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface TestResult {
  attemptId: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  isPassed: boolean;
  timeSpent: number;
}

export default function TestResultsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const qbankId = params.id;

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (attemptId && qbankId) {
      fetchResults();
    } else if (!attemptId) {
      setError('Missing attempt ID');
      setLoading(false);
    } else if (!qbankId) {
      setError('Missing Q-Bank ID');
      setLoading(false);
    }
  }, [attemptId, qbankId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/student/qbanks/${qbankId}/test/results?attemptId=${attemptId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="space-y-8">
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Results not found'}
        </div>
      </div>
    );
  }

  const percentage = result.score;
  const isPassed = result.isPassed;

  return (
    <div className="space-y-8">
      <Link
        href={`/student/qbanks/${qbankId}`}
        className="text-nurse-red-400 hover:text-nurse-red-300 inline-flex items-center gap-2 transition"
      >
        ← Back to Q-Bank
      </Link>

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="text-center mb-8">
          <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-4xl font-bold ${isPassed
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-2 border-red-500/30'
            }`}>
            {percentage.toFixed(0)}%
          </div>
          <h1 className={`text-3xl font-bold mt-6 mb-2 ${isPassed ? 'text-green-400' : 'text-nurse-red-400'}`}>
            {isPassed ? 'Congratulations! 🎉' : 'Keep Practicing!'}
          </h1>
          <p className="text-nurse-silver-400">
            {isPassed ? 'You passed the test!' : 'You need 70% to pass. Keep studying!'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{result.correctCount}</div>
            <div className="text-sm text-nurse-silver-400">Correct</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{result.incorrectCount}</div>
            <div className="text-sm text-nurse-silver-400">Incorrect</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nurse-silver-300">{result.unansweredCount}</div>
            <div className="text-sm text-nurse-silver-400">Unanswered</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{result.totalQuestions}</div>
            <div className="text-sm text-nurse-silver-400">Total</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href={`/student/qbanks/${qbankId}`}
            className="px-6 py-3 bg-gradient-to-r from-nurse-red-600 to-red-600 hover:from-nurse-red-700 hover:to-red-700 text-white rounded-xl font-semibold transition shadow-glow-red"
          >
            Back to Q-Bank
          </Link>
          <Link
            href={`/student/qbanks/${qbankId}/test`}
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition"
          >
            Take Another Test
          </Link>
          <Link
            href={`/student/qbanks/${qbankId}/analytics`}
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition"
          >
            View Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
