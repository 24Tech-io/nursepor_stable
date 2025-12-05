/**
 * Admin Sync Client
 * Client-side utility for maintaining sync connection with admin server
 * Uses polling for real-time updates (SSE optional)
 */

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export class AdminSyncClient {
  private intervalId: NodeJS.Timeout | null = null;
  private isConnected = false;
  private connectionState: ConnectionState = 'disconnected';
  private callbacks: Map<string, Function[]> = new Map();
  private subscribers = 0; // Track how many components are using it
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private pollInterval: number = 15000) {} // Poll every 15 seconds

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
    this.startPolling();
  }

  /**
   * Start polling
   */
  private startPolling() {
    this.connectionState = 'connected';
    this.poll(); // Initial poll
    this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    console.log(`🔄 Admin sync client started (polling every ${this.pollInterval / 1000}s)`);
    this.emit('connected', { method: 'polling' });
  }

  /**
   * Get authentication token from cookies
   */
  private getToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'adminToken') {
        return value;
      }
    }
    return null;
  }

  /**
   * Stop sync connection (only if no subscribers)
   */
  stop() {
    this.subscribers = Math.max(0, this.subscribers - 1);

    if (this.subscribers > 0) {
      console.log(
        `🔄 Admin sync client has ${this.subscribers} remaining subscribers, keeping connection alive`
      );
      return;
    }

    // Stop polling
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isConnected = false;
    this.connectionState = 'disconnected';
    console.log('🛑 Admin sync client stopped (no subscribers)');
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Poll for sync updates
   */
  private async poll() {
    try {
      // Check sync health
      const healthResponse = await fetch('/api/sync/health', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.health?.status === 'warning' || healthData.health?.status === 'unhealthy') {
          console.warn('⚠️ Admin sync health check detected issues:', healthData.health);
          this.emit('health-warning', healthData.health);
        }
      }

      // Get sync connection data
      const response = await fetch('/api/sync/connection', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.emit('sync', data.sync);
        console.log('✅ Admin sync poll successful');
      } else {
        console.error('❌ Admin sync poll failed:', response.status);
        this.handlePollError();
      }
    } catch (error) {
      console.error('❌ Admin sync poll error:', error);
      this.handlePollError();
    }
  }

  /**
   * Handle poll error with reconnection logic
   */
  private handlePollError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionState = 'reconnecting';
      console.log(
        `🔄 Admin sync reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
    } else {
      this.connectionState = 'disconnected';
      console.error('❌ Admin sync failed after max attempts');
      this.emit('disconnected', { reason: 'max_attempts_reached' });
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
      console.error('❌ Admin sync validation error:', error);
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
        this.emit('auto-fix-complete', data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Admin auto-fix error:', error);
      return null;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    console.log('🔄 Forcing immediate admin sync...');
    await this.poll();
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
      callbacks.forEach((callback) => callback(data));
    }
  }
}

// Export singleton instance
export const adminSyncClient = new AdminSyncClient(60000); // Poll every 60 seconds
