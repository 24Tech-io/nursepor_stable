/**
 * Enhanced Sync Client
 * Client-side utility for maintaining sync connection with server
 * Uses SSE (Server-Sent Events) for real-time updates with polling fallback
 */

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export class SyncClient {
  private intervalId: NodeJS.Timeout | null = null;
  private eventSource: EventSource | null = null;
  private isConnected = false;
  private connectionState: ConnectionState = 'disconnected';
  private callbacks: Map<string, Function[]> = new Map();
  private subscribers = 0; // Track how many components are using it
  private useSSE = true; // Try SSE first, fallback to polling
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private pollInterval: number = 5000) {} // Polling interval (fallback only)

  /**
   * Start sync connection (tries SSE first, falls back to polling)
   */
  start() {
    this.subscribers++;

    if (this.isConnected) {
      console.log(`🔄 Sync client already connected (${this.subscribers} subscribers)`);
      return;
    }

    this.isConnected = true;

    // Try SSE first
    if (this.useSSE && typeof EventSource !== 'undefined') {
      this.connectSSE();
    } else {
      // Fallback to polling
      this.startPolling();
    }
  }

  /**
   * Connect via Server-Sent Events (SSE)
   */
  private connectSSE() {
    try {
      this.connectionState = 'connecting';
      const token = this.getToken();
      if (!token) {
        console.warn('⚠️ No token found, falling back to polling');
        this.startPolling();
        return;
      }

      // Create SSE connection
      const sseUrl = '/api/sync/sse';
      this.eventSource = new EventSource(sseUrl, {
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        console.log('✅ SSE connection established');
        this.emit('connected', { method: 'sse' });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('✅ SSE connection confirmed:', data);
          } else if (data.type === 'sync') {
            this.emit('sync', data.event);
            console.log('📡 SSE sync event received:', data.event);
          } else if (data.type === 'heartbeat') {
            // Heartbeat received, connection is alive
          }
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        this.connectionState = 'disconnected';

        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.connectionState = 'reconnecting';
          console.log(
            `🔄 Attempting SSE reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
          );

          setTimeout(() => {
            if (this.isConnected) {
              this.connectSSE();
            }
          }, 2000 * this.reconnectAttempts); // Exponential backoff
        } else {
          // Fallback to polling
          console.log('⚠️ SSE failed after max attempts, falling back to polling');
          this.useSSE = false;
          this.startPolling();
        }
      };
    } catch (error) {
      console.error('❌ Error creating SSE connection:', error);
      this.startPolling();
    }
  }

  /**
   * Start polling (fallback method)
   */
  private startPolling() {
    this.connectionState = 'connected';
    this.useSSE = false;
    this.poll();
    this.intervalId = setInterval(() => this.poll(), this.pollInterval);
    console.log('🔄 Sync client started (polling mode)');
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
      if (name === 'token' || name === 'adminToken') {
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
        `🔄 Sync client has ${this.subscribers} remaining subscribers, keeping connection alive`
      );
      return;
    }

    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Stop polling
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isConnected = false;
    this.connectionState = 'disconnected';
    console.log('🛑 Sync client stopped (no subscribers)');
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if using SSE
   */
  isUsingSSE(): boolean {
    return this.useSSE && this.eventSource !== null;
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
        },
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
      callbacks.forEach((callback) => callback(data));
    }
  }
}

// Export singleton instance
export const syncClient = new SyncClient(5000); // Poll every 5 seconds for maximum sync speed
