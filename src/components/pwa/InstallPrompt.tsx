'use client';

import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

export default function InstallPrompt() {
    const { canInstall, isInstalled, installing, install } = usePWA();
    const [dismissed, setDismissed] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Show prompt after 30 seconds if installable and not dismissed
        const timer = setTimeout(() => {
            if (canInstall && !isInstalled && !dismissed) {
                setShowPrompt(true);
            }
        }, 30000);

        return () => clearTimeout(timer);
    }, [canInstall, isInstalled, dismissed]);

    const handleInstall = async () => {
        const success = await install();
        if (success) {
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShowPrompt(false);
        // Remember dismissal for this session
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    // Don't show if already installed, can't install, or dismissed
    if (isInstalled || !canInstall || !showPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 p-6 backdrop-blur-xl">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                    aria-label="Dismiss"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-nurse-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-nurse-red-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-1">
                            Install NursePro Academy
                        </h3>
                        <p className="text-sm text-slate-300 mb-4">
                            Get quick access and offline capabilities. Install our app for a better experience!
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleInstall}
                                disabled={installing}
                                className="px-4 py-2 bg-gradient-to-r from-nurse-red-600 to-red-600 text-white rounded-xl font-semibold hover:from-nurse-red-700 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {installing ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Installing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Install
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
