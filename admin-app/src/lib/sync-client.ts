/**
 * Admin Sync Client
 * Client-side utility for maintaining sync connection with server for admin app
 * Automatically polls for updates and keeps data in sync
 */

export class AdminSyncClient {
  private intervalId: NodeJS.Timeout | null = null;
  private isConnected = false;
  private callbacks: Map<string, Function[]> = new Map();
  private subscribers = 0; // Track how many components are using it

  constructor(private pollInterval: number = 5000) {} // Optimized to 5 seconds for maximum sync speed

  /**
   * Start sync connection
   */
  start() {
    this.subscribers++;
    
    if (this.isConnected) {
      console.log(`🔄 Admin sync client already connected (${this.subscribers} subscribers)`);
      return;
    }

    this.isConnected = true;
    this.poll();
    this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    console.log('🔄 Admin sync client started');
  }

  /**
   * Stop sync connection (only if no subscribers)
   */
  stop() {
    this.subscribers = Math.max(0, this.subscribers - 1);
    
    if (this.subscribers > 0) {
      console.log(`🔄 Admin sync client has ${this.subscribers} remaining subscribers, keeping connection alive`);
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isConnected = false;
    console.log('🛑 Admin sync client stopped (no subscribers)');
  }

  /**
   * Poll for sync updates
   */
  private async poll() {
    try {
      // Get sync connection data (admin-specific)
      const response = await fetch('/api/sync/connection', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.emit('sync', data.sync);
        console.log('✅ Admin sync poll successful:', data.sync);
      } else {
        console.error('❌ Admin sync poll failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Admin sync poll error:', error);
    }
  }

  /**
   * Subscribe to sync events
   */
  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from sync events
   */
  off(event: string, callback: Function) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit sync event
   */
  private emit(event: string, data: any) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
export const adminSyncClient = new AdminSyncClient(5000); // Poll every 5 seconds for maximum sync speed

