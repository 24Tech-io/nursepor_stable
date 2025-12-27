/**
 * useBackgroundSync Hook
 * React hook for queueing background sync operations
 */

import { useState, useEffect, useCallback } from 'react';
import BackgroundSync, { type SyncStatus } from '@/lib/background-sync';

export function useBackgroundSync() {
    const [status, setStatus] = useState<SyncStatus>({
        syncing: false,
        pending: 0,
        failed: 0,
    });

    useEffect(() => {
        // Get initial status
        BackgroundSync.getStatus().then(setStatus);

        // Listen for status changes
        const unsubscribe = BackgroundSync.onStatusChange(setStatus);

        return unsubscribe;
    }, []);

    /**
     * Queue quiz submission
     */
    const queueQuizSubmit = useCallback(async (quizId: number, answers: any) => {
        return BackgroundSync.queueQuizSubmit(quizId, answers);
    }, []);

    /**
     * Queue video progress
     */
    const queueVideoProgress = useCallback(async (
        videoId: number,
        progress: number,
        position: number
    ) => {
        return BackgroundSync.queueVideoProgress(videoId, progress, position);
    }, []);

    /**
     * Queue chapter completion
     */
    const queueChapterComplete = useCallback(async (chapterId: number) => {
        return BackgroundSync.queueChapterComplete(chapterId);
    }, []);

    /**
     * Queue generic API request
     */
    const queueApiRequest = useCallback(async (
        url: string,
        method: string,
        data: any
    ) => {
        return BackgroundSync.queueApiRequest(url, method, data);
    }, []);

    /**
     * Trigger immediate sync
     */
    const sync = useCallback(async () => {
        return BackgroundSync.sync();
    }, []);

    /**
     * Clear failed items
     */
    const clearFailed = useCallback(async () => {
        return BackgroundSync.clearFailed();
    }, []);

    return {
        status,
        queueQuizSubmit,
        queueVideoProgress,
        queueChapterComplete,
        queueApiRequest,
        sync,
        clearFailed,
    };
}
