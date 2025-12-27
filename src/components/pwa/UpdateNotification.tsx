'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

export default function UpdateNotification() {
    const { updateAvailable, applyUpdate } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    if (!updateAvailable || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 text-white">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold mb-1">
                            Update Available
                        </h3>
                        <p className="text-sm text-white/90 mb-4">
                            A new version of N ursePro Academy is available. Update now for the latest features and improvements!
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => applyUpdate()}
                                className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-white/90 transition"
                            >
                                Update Now
                            </button>

                            <button
                                onClick={() => setDismissed(true)}
                                className="px-4 py-2 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition"
                            >
                                Later
                            </button>
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-white/80 hover:text-white transition flex-shrink-0"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
