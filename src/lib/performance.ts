/**
 * Performance Monitoring and Optimization Utilities
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private longTasks: PerformanceMetric[] = [];

  /**
   * Start performance measurement
   */
  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  /**
   * End performance measurement
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Track long tasks (>100ms)
    if (metric.duration > 100) {
      this.longTasks.push({ ...metric });
    }

    this.metrics.delete(name);
    return metric.duration;
  }

  /**
   * Measure async function
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  /**
   * Get long tasks
   */
  getLongTasks(): PerformanceMetric[] {
    return this.longTasks;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
    this.longTasks = [];
  }

  /**
   * Get performance report
   */
  getReport(): {
    longTasks: PerformanceMetric[];
    averageTaskTime: number;
  } {
    const durations = this.longTasks.map((t) => t.duration || 0);
    const average = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      longTasks: this.longTasks,
      averageTaskTime: average,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load component
 */
export function lazyLoad<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    importFn()
      .then((module) => {
        const duration = performance.now() - startTime;
        if (duration > 1000) {
          console.warn(`⚠️ Slow lazy load: ${duration.toFixed(2)}ms`);
        }
        resolve(module.default);
      })
      .catch(reject);
  });
}
