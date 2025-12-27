/**
 * usePWA Hook
 * React hook for Progressive Web App features
 */

import { useState, useEffect, useCallback } from 'react';
import {
    registerServiceWorker,
    isPWA,
    isOnline,
    addConnectivityListeners,
    triggerInstall,
} from '@/lib/pwa-utils';

export interface PWAState {
    isInstalled: boolean;
    isOnline: boolean;
    canInstall: boolean;
    updateAvailable: boolean;
    installing: boolean;
}

export function usePWA() {
    const [state, setState] = useState<PWAState>({
        isInstalled: false,
        isOnline: true,
        canInstall: false,
        updateAvailable: false,
        installing: false,
    });

    const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

    // Initialize PWA
    useEffect(() => {
        // Check if already installed
        setState((prev) => ({
            ...prev,
            isInstalled: isPWA(),
            isOnline: isOnline(),
        }));

        // Register service worker
        registerServiceWorker();

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setState((prev) => ({ ...prev, canInstall: true }));
        };

        // Listen for app installed
        const handleAppInstalled = () => {
            setState((prev) => ({ ...prev, isInstalled: true, canInstall: false }));
            setDeferredPrompt(null);
        };

        // Listen for PWA updates
        const handlePWAUpdate = () => {
            setState((prev) => ({ ...prev, updateAvailable: true }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('pwa-update-available', handlePWAUpdate);

        // Listen for connectivity changes
        const cleanupConnectivity = addConnectivityListeners(
            () => setState((prev) => ({ ...prev, isOnline: true })),
            () => setState((prev) => ({ ...prev, isOnline: false }))
        );

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('pwa-update-available', handlePWAUpdate);
            cleanupConnectivity();
        };
    }, []);

    // Install app
    const install = useCallback(async () => {
        if (!deferredPrompt) {
            return false;
        }

        setState((prev) => ({ ...prev, installing: true }));

        try {
            const success = await triggerInstall();
            setState((prev) => ({
                ...prev,
                installing: false,
                canInstall: !success,
                isInstalled: success,
            }));
            return success;
        } catch (error) {
            console.error('Install failed:', error);
            setState((prev) => ({ ...prev, installing: false }));
            return false;
        }
    }, [deferredPrompt]);

    // Reload app to apply update
    const applyUpdate = useCallback(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (registration?.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            });

            // Reload after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }, []);

    return {
        ...state,
        install,
        applyUpdate,
    };
}
