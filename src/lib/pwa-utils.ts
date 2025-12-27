/**
 * PWA Utility Functions
 * Helper functions for Progressive Web App features
 */

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {

    // FORCE UNREGISTER ALL SERVICE WORKERS TO CLEAR STALE CACHE
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        console.log('🧹 Attempting to unregister all service workers...');
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('❌ Unregistered Service Worker:', registration.scope);
            }
            if (registrations.length > 0) {
                console.log('♻️ Service Workers cleared. Reload might be needed.');
            }
        } catch (e) {
            console.error('Failed to unregister SW:', e);
        }
    }

    // Disabled SW registration for development/debugging
    /*
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('Service Workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('✅ Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        console.log('🔄 New version available');
                        dispatchUpdateEvent();
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
    }
    */
    return null;
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const success = await registration.unregister();
            console.log('Service Worker unregistered:', success);
            return success;
        }
        return false;
    } catch (error) {
        console.error('Service Worker unregister failed:', error);
        return false;
    }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('Notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('Notification permission request failed:', error);
        return 'denied';
    }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
    registration: ServiceWorkerRegistration,
    vapidPublicKey: string
): Promise<PushSubscription | null> {
    try {
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            return null;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        console.log('✅ Push subscription created:', subscription.endpoint);
        return subscription;
    } catch (error) {
        console.error('❌ Push subscription failed:', error);
        return null;
    }
}

/**
 * Check if app is running as PWA
 */
export function isPWA(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check iOS standalone
    const isIOSStandalone = (window.navigator as any).standalone === true;

    return isStandalone || isIOSStandalone;
}

/**
 * Check if app is installable
 */
export function isInstallable(): boolean {
    if (typeof window === 'undefined') return false;

    // Check if install prompt is available
    return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
}

/**
 * Get installation prompt
 */
export function getInstallPrompt(): Event | null {
    if (typeof window === 'undefined') return null;
    return (window as any).deferredPrompt || null;
}

/**
 * Trigger install prompt
 */
export async function triggerInstall(): Promise<boolean> {
    const prompt = getInstallPrompt();
    if (!prompt) {
        console.log('Install prompt not available');
        return false;
    }

    try {
        (prompt as any).prompt();
        const result = await (prompt as any).userChoice;
        console.log('Install prompt result:', result.outcome);

        // Clear the deferred prompt
        (window as any).deferredPrompt = null;

        return result.outcome === 'accepted';
    } catch (error) {
        console.error('Install prompt failed:', error);
        return false;
    }
}

/**
 * Check online status
 */
export function isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
}

/**
 * Add online/offline listeners
 */
export function addConnectivityListeners(
    onOnline: () => void,
    onOffline: () => void
): () => void {
    if (typeof window === 'undefined') {
        return () => { };
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    };
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('✅ All caches cleared');
    } catch (error) {
        console.error('❌ Failed to clear caches:', error);
    }
}

/**
 * Dispatch custom update event
 */
function dispatchUpdateEvent(): void {
    const event = new CustomEvent('pwa-update-available');
    window.dispatchEvent(event);
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Show notification
 */
export async function showNotification(
    title: string,
    options?: NotificationOptions
): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            ...options,
        });
    } catch (error) {
        console.error('Failed to show notification:', error);
    }
}
