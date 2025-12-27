'use client';

import { useState, useEffect } from 'react';
import BackgroundSync, { type SyncStatus } from '@/lib/background-sync';

export default function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        syncing: false,
        pending: 0,
        failed: 0,
    });

    useEffect(() => {
        // Initial state
        setIsOnline(navigator.onLine);
        BackgroundSync.getStatus().then(setSyncStatus);

        // Online/offline listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync status listener
        const unsubscribe = BackgroundSync.onStatusChange(setSyncStatus);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubscribe();
        };
    }, []);

    // Don't show if online and nothing pending
    if (isOnline && !syncStatus.syncing && syncStatus.pending === 0 && syncStatus.failed === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            {/* Offline indicator */}
            {!isOnline && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg mb-2">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-800 font-medium">
                                You're offline
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                                Changes will sync when you're back online
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Syncing indicator */}
            {syncStatus.syncing && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow-lg mb-2">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-800 font-medium">
                                Syncing your changes...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending sync indicator */}
            {!syncStatus.syncing && syncStatus.pending > 0 && (
                <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg shadow-lg mb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-purple-800 font-medium">
                                    {syncStatus.pending} item{syncStatus.pending > 1 ? 's' : ''} pending sync
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => BackgroundSync.sync()}
                            className="ml-4 px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition"
                        >
                            Sync Now
                        </button>
                    </div>
                </div>
            )}

            {/* Failed sync indicator */}
            {syncStatus.failed > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800 font-medium">
                                    {syncStatus.failed} sync error{syncStatus.failed > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => BackgroundSync.clearFailed()}
                            className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
