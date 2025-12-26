'use client';

import Link from 'next/link';
import AnalyticsDashboard from '@/components/student/AnalyticsDashboard';

export default function QBankAnalyticsPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/student/qbanks/${params.id}`}
          className="text-nurse-red-400 hover:text-nurse-red-300 inline-flex items-center gap-2 transition"
        >
          ← Back to Q-Bank
        </Link>
        <h1 className="text-4xl font-bold text-white mt-4">Analytics Dashboard</h1>
      </div>

      <AnalyticsDashboard qbankId={parseInt(params.id)} />
    </div>
  );
}
