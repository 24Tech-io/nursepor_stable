/**
 * Connection Monitor - Detects slow connections and handles lag
 */

class ConnectionMonitor {
  private connectionType: string = 'unknown';
  private effectiveType: string = 'unknown';
  private downlink: number = 0;
  private rtt: number = 0;
  private isSlowConnection: boolean = false;
  private listeners: Set<(isSlow: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      this.init();
    }
  }

  private init() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      this.updateConnectionInfo(connection);
      connection.addEventListener('change', () => this.updateConnectionInfo(connection));
    }
  }

  private updateConnectionInfo(connection: any) {
    this.connectionType = connection.type || 'unknown';
    this.effectiveType = connection.effectiveType || 'unknown';
    this.downlink = connection.downlink || 0;
    this.rtt = connection.rtt || 0;

    // Consider connection slow if:
    // - effectiveType is 'slow-2g' or '2g'
    // - RTT > 1000ms
    // - downlink < 0.5 Mbps
    this.isSlowConnection =
      this.effectiveType === 'slow-2g' ||
      this.effectiveType === '2g' ||
      this.rtt > 1000 ||
      this.downlink < 0.5;

    // Notify listeners
    this.listeners.forEach((listener) => listener(this.isSlowConnection));
  }

  /**
   * Check if connection is slow
   */
  isSlow(): boolean {
    return this.isSlowConnection;
  }

  /**
   * Get connection info
   */
  getInfo() {
    return {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      downlink: this.downlink,
      rtt: this.rtt,
      isSlow: this.isSlowConnection,
    };
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(callback: (isSlow: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get recommended timeout based on connection
   */
  getRecommendedTimeout(): number {
    if (this.isSlowConnection) {
      return 30000; // 30 seconds for slow connections
    }
    if (this.effectiveType === '3g') {
      return 15000; // 15 seconds for 3G
    }
    return 10000; // 10 seconds for fast connections
  }

  /**
   * Get recommended retry delay based on connection
   */
  getRecommendedRetryDelay(): number {
    if (this.isSlowConnection) {
      return 3000; // 3 seconds for slow connections
    }
    return 1000; // 1 second for fast connections
  }
}

export const connectionMonitor = new ConnectionMonitor();

