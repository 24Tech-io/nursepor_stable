'use client';

import { useEffect, useState } from 'react';
import { Laptop, Smartphone, Tablet, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/student/LoadingSpinner';

interface Session {
    id: number;
    deviceInfo: string;
    createdAt: string;
    expiresAt: string;
}

export default function SessionManagementPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await fetch('/api/auth/sessions', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const terminateSession = async (sessionId: number) => {
        if (!confirm('Are you sure you want to log out this device?')) return;

        try {
            const response = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                alert('Session terminated successfully');
            }
        } catch (error) {
            console.error('Error terminating session:', error);
            alert('Failed to terminate session');
        }
    };

    const getDeviceIcon = (deviceInfo: string) => {
        const lower = deviceInfo.toLowerCase();
        if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
            return <Smartphone className="text-blue-500" size={24} />;
        }
        if (lower.includes('tablet') || lower.includes('ipad')) {
            return <Tablet className="text-purple-500" size={24} />;
        }
        return <Laptop className="text-gray-600" size={24} />;
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading active sessions..." fullScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Active Sessions</h1>
                    <p className="text-gray-600">Manage devices where you're currently logged in</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">
                            Your Devices ({sessions.length})
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {sessions.length === 0 ? (
                            <div className="p-12 text-center">
                                <Laptop size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-600">No active sessions found</p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div key={session.id} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 rounded-xl">
                                                {getDeviceIcon(session.deviceInfo)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{session.deviceInfo || 'Unknown Device'}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                    <span>
                                                        Logged in: {new Date(session.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        Expires: {new Date(session.expiresAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => terminateSession(session.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition"
                                        >
                                            <Trash2 size={16} />
                                            Log Out
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Security Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2">Security Tip</h3>
                    <p className="text-sm text-blue-700">
                        If you see a device you don't recognize, log it out immediately and change your password.
                    </p>
                </div>
            </div>
        </div>
    );
}
