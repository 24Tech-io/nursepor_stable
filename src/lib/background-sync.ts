/**
 * Background Sync System
 * Handles offline request queuing and automatic synchronization
 */

import IndexedDB, { type SyncQueueItem } from './indexed-db';
import { v4 as uuidv4 } from 'uuid';

type SyncType = 'quiz-submit' | 'video-progress' | 'chapter-complete' | 'api-request';

interface QueueOptions {
    maxRetries?: number;
    priority?: 'high' | 'normal' | 'low';
    timeout?: number;
}

class BackgroundSyncManager {
    private syncing = false;
    private listeners: Set<(status: SyncStatus) => void> = new Set();

    /**
     * Queue an operation for background sync
     */
    async queue(
        type: SyncType,
        url: string,
        method: string,
        data: any,
        options: QueueOptions = {}
    ): Promise<string> {
        const id = uuidv4();
        const item: SyncQueueItem = {
            id,
            type,
            url,
            method,
            data,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: options.maxRetries || 3,
            status: 'pending',
        };

        await IndexedDB.putSyncItem(item);
        console.log(`📥 Queued ${type}:`, id);

        // Trigger sync if online
        if (navigator.onLine) {
            this.triggerSync();
        }

        return id;
    }

    /**
     * Register for sync events (in service worker)
     */
    async register(): Promise<void> {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            if ('sync' in registration) {
                await (registration as any).sync.register('background-sync');
                console.log('✅ Background sync registered');
            }
        } catch (error) {
            console.error('❌ Background sync registration failed:', error);
        }
    }

    /**
     * Trigger immediate sync
     */
    async triggerSync(): Promise<void> {
        if (this.syncing) {
            console.log('⏸️  Sync already in progress');
            return;
        }

        if (!navigator.onLine) {
            console.log('📵 Offline - sync deferred');
            return;
        }

        this.syncing = true;
        this.notifyListeners({ syncing: true, pending: 0, failed: 0 });

        try {
            const pendingItems = await IndexedDB.getPendingSyncItems();
            console.log(`🔄 Syncing ${pendingItems.length} items`);

            let successCount = 0;
            let failCount = 0;

            for (const item of pendingItems) {
                try {
                    await this.syncItem(item);
                    successCount++;
                    await IndexedDB.deleteSyncItem(item.id);
                } catch (error) {
                    failCount++;
                    await this.handleSyncFailure(item, error);
                }
            }

            console.log(`✅ Sync complete: ${successCount} success, ${failCount} failed`);
            this.notifyListeners({
                syncing: false,
                pending: failCount,
                failed: failCount,
            });
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.notifyListeners({ syncing: false, pending: 0, failed: 0 });
        } finally {
            this.syncing = false;
        }
    }

    /**
     * Sync a single item
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        console.log(`🔄 Syncing ${item.type}:`, item.id);

        // Update status
        await IndexedDB.putSyncItem({ ...item, status: 'syncing' });

        // Make API request
        const response = await fetch(item.url, {
            method: item.method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: item.method !== 'GET' ? JSON.stringify(item.data) : undefined,
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✅ Synced ${item.type}:`, item.id);
    }

    /**
     * Handle sync failure
     */
    private async handleSyncFailure(item: SyncQueueItem, error: any): Promise<void> {
        const retries = item.retries + 1;

        if (retries >= item.maxRetries) {
            console.error(`❌ Max retries reached for ${item.type}:`, item.id);
            await IndexedDB.putSyncItem({
                ...item,
                status: 'failed',
                retries,
            });
        } else {
            console.warn(`⚠️  Retry ${retries}/${item.maxRetries} for ${item.type}:`, item.id);
            await IndexedDB.putSyncItem({
                ...item,
                status: 'pending',
                retries,
            });
        }
    }

    /**
     * Get sync status
     */
    async getStatus(): Promise<SyncStatus> {
        const all = await IndexedDB.getAllSyncItems();
        const pending = all.filter((item) => item.status === 'pending').length;
        const failed = all.filter((item) => item.status === 'failed').length;

        return {
            syncing: this.syncing,
            pending,
            failed,
        };
    }

    /**
     * Clear failed items
     */
    async clearFailed(): Promise<void> {
        const all = await IndexedDB.getAllSyncItems();
        const failed = all.filter((item) => item.status === 'failed');

        for (const item of failed) {
            await IndexedDB.deleteSyncItem(item.id);
        }
    }

    /**
     * Add status listener
     */
    onStatusChange(callback: (status: SyncStatus) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify listeners of status change
     */
    private notifyListeners(status: SyncStatus): void {
        this.listeners.forEach((callback) => callback(status));
    }

    /**
     * Initialize sync manager
     */
    async init(): Promise<void> {
        // Register for background sync
        await this.register();

        // Listen for online event
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('📶 Back online - triggering sync');
                this.triggerSync();
            });
        }

        // Periodic sync (every 5 minutes when online)
        if (typeof window !== 'undefined') {
            setInterval(() => {
                if (navigator.onLine && !this.syncing) {
                    this.triggerSync();
                }
            }, 5 * 60 * 1000);
        }
    }
}

export interface SyncStatus {
    syncing: boolean;
    pending: number;
    failed: number;
}

// Singleton instance
const syncManager = new BackgroundSyncManager();

// Auto-initialize
if (typeof window !== 'undefined') {
    syncManager.init().catch(console.error);
}

// Exported API
export const BackgroundSync = {
    /**
     * Queue quiz submission for background sync
     */
    queueQuizSubmit: async (quizId: number, answers: any) => {
        return syncManager.queue(
            'quiz-submit',
            `/api/student/quizzes/${quizId}/submit`,
            'POST',
            { answers },
            { maxRetries: 5 }
        );
    },

    /**
     * Queue video progress update
     */
    queueVideoProgress: async (videoId: number, progress: number, position: number) => {
        return syncManager.queue(
            'video-progress',
            '/api/student/video-progress',
            'POST',
            { videoId, progress, currentTime: position },
            { maxRetries: 3 }
        );
    },

    /**
     * Queue chapter completion
     */
    queueChapterComplete: async (chapterId: number) => {
        return syncManager.queue(
            'chapter-complete',
            '/api/student/chapters/complete',
            'POST',
            { chapterId },
            { maxRetries: 5 }
        );
    },

    /**
     * Queue generic API request
     */
    queueApiRequest: async (url: string, method: string, data: any, options?: QueueOptions) => {
        return syncManager.queue('api-request', url, method, data, options);
    },

    /**
     * Trigger immediate sync
     */
    sync: () => syncManager.triggerSync(),

    /**
     * Get current sync status
     */
    getStatus: () => syncManager.getStatus(),

    /**
     * Clear failed sync items
     */
    clearFailed: () => syncManager.clearFailed(),

    /**
     * Listen for status changes
     */
    onStatusChange: (callback: (status: SyncStatus) => void) => syncManager.onStatusChange(callback),
};

export default BackgroundSync;
