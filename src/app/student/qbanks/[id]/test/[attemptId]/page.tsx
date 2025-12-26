'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TestInterface from '@/components/student/TestInterface';

export default function TestRunnerPage() {
    const params = useParams();
    const qbankId = params.id as string;
    const attemptId = params.attemptId as string;
    const router = useRouter();

    const [sessionData, setSessionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSession();
    }, [qbankId, attemptId]);

    const fetchSession = async () => {
        try {
            const res = await fetch(`/api/student/qbanks/${qbankId}/test/${attemptId}`, {
                credentials: 'include'
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to load test session');
            }
            const data = await res.json();
            setSessionData(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nurse-red-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Error Loading Test</h1>
                    <p className="text-red-400 mb-6">{error}</p>
                    <button onClick={() => router.push(`/student/qbanks/${qbankId}`)} className="text-blue-400 hover:underline">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <TestInterface
            qbankId={parseInt(qbankId)}
            attemptId={parseInt(attemptId)}
            initialData={sessionData}
        />
    );
}
