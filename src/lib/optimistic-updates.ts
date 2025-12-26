/**
 * Optimistic Update Utilities
 * 
 * Provides optimistic state updates with rollback on error
 * and queue for offline actions.
 */

type StateUpdater<T> = (previousState: T) => T;
type RollbackFn = () => void;

interface OptimisticUpdate<T> {
  id: string;
  previousState: T;
  optimisticState: T;
  rollback: RollbackFn;
  timestamp: number;
}

class OptimisticUpdateManager<T> {
  private updates: Map<string, OptimisticUpdate<T>> = new Map();
  private state: T;
  private setState: (updater: StateUpdater<T>) => void;

  constructor(initialState: T, setState: (updater: StateUpdater<T>) => void) {
    this.state = initialState;
    this.setState = setState;
  }

  /**
   * Apply optimistic update
   */
  applyOptimistic(
    id: string,
    optimisticState: T,
    rollback: RollbackFn
  ): void {
    const previousState = this.state;
    
    this.updates.set(id, {
      id,
      previousState,
      optimisticState,
      rollback,
      timestamp: Date.now(),
    });

    this.state = optimisticState;
    this.setState(() => optimisticState);
  }

  /**
   * Confirm optimistic update (API succeeded)
   */
  confirm(id: string, finalState?: T): void {
    const update = this.updates.get(id);
    if (update) {
      if (finalState !== undefined) {
        this.state = finalState;
        this.setState(() => finalState);
      } else {
        // Keep optimistic state
        this.state = update.optimisticState;
      }
      this.updates.delete(id);
    }
  }

  /**
   * Rollback optimistic update (API failed)
   */
  rollback(id: string): void {
    const update = this.updates.get(id);
    if (update) {
      this.state = update.previousState;
      this.setState(() => update.previousState);
      update.rollback();
      this.updates.delete(id);
    }
  }

  /**
   * Rollback all pending updates
   */
  rollbackAll(): void {
    for (const [id, update] of this.updates.entries()) {
      this.state = update.previousState;
      this.setState(() => update.previousState);
      update.rollback();
    }
    this.updates.clear();
  }

  /**
   * Get current state
   */
  getState(): T {
    return this.state;
  }

  /**
   * Check if there are pending updates
   */
  hasPendingUpdates(): boolean {
    return this.updates.size > 0;
  }
}

/**
 * Create optimistic update manager
 */
export function createOptimisticManager<T>(
  initialState: T,
  setState: (updater: StateUpdater<T>) => void
): OptimisticUpdateManager<T> {
  return new OptimisticUpdateManager(initialState, setState);
}

/**
 * Execute optimistic update with API call
 */
export async function optimisticUpdate<T, R>(
  optimisticState: T,
  apiCall: () => Promise<R>,
  onSuccess?: (result: R, finalState?: T) => void,
  onError?: (error: Error, rollback: () => void) => void
): Promise<R> {
  // Store previous state for rollback
  let rolledBack = false;
  const rollback = () => {
    if (!rolledBack) {
      rolledBack = true;
    }
  };

  try {
    const result = await apiCall();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error) {
    rollback();
    if (onError) {
      onError(error as Error, rollback);
    } else {
      throw error;
    }
    throw error;
  }
}

/**
 * Queue for offline actions
 */
class OfflineQueue {
  private queue: Array<{
    id: string;
    action: () => Promise<any>;
    timestamp: number;
  }> = [];

  /**
   * Add action to queue
   */
  enqueue(id: string, action: () => Promise<any>): void {
    this.queue.push({
      id,
      action,
      timestamp: Date.now(),
    });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
      } catch (error) {
        console.warn('Failed to persist offline queue:', error);
      }
    }
  }

  /**
   * Process queue when online
   */
  async processQueue(): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return;
    }

    const queue = [...this.queue];
    this.queue = [];

    for (const item of queue) {
      try {
        await item.action();
      } catch (error) {
        console.error(`Failed to process queued action ${item.id}:`, error);
        // Re-queue failed actions
        this.queue.push(item);
      }
    }

    // Update localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
      } catch (error) {
        console.warn('Failed to update offline queue:', error);
      }
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueue(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('offlineQueue');
      } catch (error) {
        console.warn('Failed to clear offline queue:', error);
      }
    }
  }
}

// Singleton offline queue
let offlineQueueInstance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue();
    offlineQueueInstance.loadQueue();
    
    // Process queue when online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        offlineQueueInstance?.processQueue();
      });
    }
  }
  return offlineQueueInstance;
}



