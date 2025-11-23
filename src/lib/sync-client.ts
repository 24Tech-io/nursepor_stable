/**
 * Sync Client
 * Client-side utility for maintaining sync connection with server
 * Automatically polls for updates and keeps data in sync
 */

export class SyncClient {
  private intervalId: NodeJS.Timeout | null = null;
  private isConnected = false;
  private callbacks: Map<string, Function[]> = new Map();

  constructor(private pollInterval: number = 30000) {}

  /**
   * Start sync connection
   */
  start() {
    if (this.isConnected) {
      console.warn('Sync client already connected');
      return;
    }

    this.isConnected = true;
    this.poll();
    this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    console.log('🔄 Sync client started');
  }

  /**
   * Stop sync connection
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isConnected = false;
    console.log('🛑 Sync client stopped');
  }

  /**
   * Poll for sync updates
   */
  private async poll() {
    try {
      // First check health
      const healthResponse = await fetch('/api/sync/health', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.health?.status === 'warning' || healthData.health?.status === 'unhealthy') {
          console.warn('⚠️ Sync health check detected issues:', healthData.health);
          this.emit('health-warning', healthData.health);
        }
      }

      // Then get sync connection data
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
        console.log('✅ Sync poll successful:', data.sync);
      } else {
        console.error('❌ Sync poll failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Sync poll error:', error);
    }
  }

  /**
   * Validate sync status
   */
  async validateSync() {
    try {
      const response = await fetch('/api/sync/validate', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Sync validation error:', error);
      return null;
    }
  }

  /**
   * Auto-fix sync issues
   */
  async autoFix() {
    try {
      const response = await fetch('/api/sync/auto-fix', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Auto-fix error:', error);
      return null;
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
export const syncClient = new SyncClient(30000); // Poll every 30 seconds

