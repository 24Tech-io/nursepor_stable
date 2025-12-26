'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import TestCreationDashboard, { TestConfig } from '@/components/student/TestCreationDashboard';

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const qbankId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartTest = async (config: TestConfig) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/student/qbanks/${qbankId}/test/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start test');
      }

      const data = await response.json();
      router.push(`/student/qbanks/${qbankId}/test/${data.attemptId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/student/qbanks/${qbankId}`}
          className="text-nurse-silver-400 hover:text-white mb-6 inline-flex items-center gap-2 transition-colors"
        >
          ← Back to Q-Bank
        </Link>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <TestCreationDashboard
          qbankId={parseInt(qbankId)}
          onStartTest={handleStartTest}
          loading={loading}
        />
      </div>
    </div>
  );
}

