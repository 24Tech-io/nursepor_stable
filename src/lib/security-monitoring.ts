/**
 * Security Monitoring & Alerting
 * Real-time security event monitoring and alerting system
 */

import { securityLogger } from './edge-logger';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  ip: string;
  path?: string;
  userId?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export enum SecurityEventType {
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  CSRF_VIOLATION = 'csrf_violation',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security event store (in-memory, would use Redis in production)
 */
class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000;
  private alertThresholds = {
    [SecuritySeverity.LOW]: 100,
    [SecuritySeverity.MEDIUM]: 50,
    [SecuritySeverity.HIGH]: 10,
    [SecuritySeverity.CRITICAL]: 1,
  };

  /**
   * Record a security event
   */
  recordEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to events
    this.events.push(fullEvent);

    // Limit memory usage
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log event
    securityLogger.info(fullEvent.type, {
      severity: fullEvent.severity,
      ip: fullEvent.ip,
      path: fullEvent.path,
      userId: fullEvent.userId,
      ...fullEvent.details,
    });

    // Check if alert should be triggered
    this.checkAlertThreshold(fullEvent);
  }

  /**
   * Check if alert threshold is exceeded
   */
  private checkAlertThreshold(event: SecurityEvent): void {
    const recentEvents = this.getRecentEvents(5 * 60 * 1000); // Last 5 minutes
    const severityCount = recentEvents.filter(
      (e) => e.severity === event.severity
    ).length;

    if (severityCount >= this.alertThresholds[event.severity]) {
      this.triggerAlert(event.severity, severityCount);
    }
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(severity: SecuritySeverity, count: number): void {
    console.error(`🚨 SECURITY ALERT: ${count} ${severity} events in last 5 minutes!`);

    // In production, send to:
    // - Sentry
    // - PagerDuty
    // - Email
    // - Slack
    // - SMS (for critical)

    // Log alert
    securityLogger.info('security_alert_triggered', {
      severity,
      count,
      threshold: this.alertThresholds[severity],
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(milliseconds: number): SecurityEvent[] {
    const cutoff = Date.now() - milliseconds;
    return this.events.filter((e) => e.timestamp.getTime() > cutoff);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events by IP
   */
  getEventsByIP(ip: string): SecurityEvent[] {
    return this.events.filter((e) => e.ip === ip);
  }

  /**
   * Check if IP is suspicious
   */
  isIPSuspicious(ip: string): boolean {
    const recentEvents = this.getRecentEvents(60 * 60 * 1000); // Last hour
    const ipEvents = recentEvents.filter((e) => e.ip === ip);

    // More than 10 high/critical events in last hour
    const dangerousEvents = ipEvents.filter(
      (e) => e.severity === SecuritySeverity.HIGH || e.severity === SecuritySeverity.CRITICAL
    );

    return dangerousEvents.length >= 10;
  }

  /**
   * Get security statistics
   */
  getStatistics(minutes: number = 60): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topIPs: { ip: string; count: number }[];
  } {
    const events = this.getRecentEvents(minutes * 60 * 1000);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    events.forEach((event) => {
      // Count by type
      byType[event.type] = (byType[event.type] || 0) + 1;

      // Count by severity
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;

      // Count by IP
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    });

    // Get top IPs
    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: events.length,
      byType,
      bySeverity,
      topIPs,
    };
  }

  /**
   * Clear old events (cleanup)
   */
  clearOldEvents(olderThanDays: number = 7): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const beforeCount = this.events.length;

    this.events = this.events.filter((e) => e.timestamp.getTime() > cutoff);

    return beforeCount - this.events.length;
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

/**
 * Helper function to record events
 */
export function recordSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  ip: string,
  details?: {
    path?: string;
    userId?: string;
    [key: string]: any;
  }
): void {
  securityMonitor.recordEvent({
    type,
    severity,
    ip,
    ...details,
  });
}

/**
 * Quick check functions
 */
export const SecurityChecks = {
  /**
   * Check for SQL injection patterns
   */
  hasSQLInjection(input: string): boolean {
    const patterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bOR\b.*=.*\bOR\b)/i,
      /('.*OR.*'=')/i,
    ];

    return patterns.some((pattern) => pattern.test(input));
  },

  /**
   * Check for XSS patterns
   */
  hasXSS(input: string): boolean {
    const patterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=\s*['"][^'"]*['"]/i,
      /<iframe[^>]*>/i,
      /<embed[^>]*>/i,
      /<object[^>]*>/i,
    ];

    return patterns.some((pattern) => pattern.test(input));
  },

  /**
   * Check for path traversal
   */
  hasPathTraversal(input: string): boolean {
    const patterns = [
      /\.\.[\/\\]/,
      /%2e%2e[\/\\]/i,
      /\.\.[%252f|%255c]/i,
    ];

    return patterns.some((pattern) => pattern.test(input));
  },

  /**
   * Check for command injection
   */
  hasCommandInjection(input: string): boolean {
    const patterns = [
      /[;&|`$()]/,
      /\b(cat|ls|rm|chmod|wget|curl|nc|bash|sh)\b/i,
    ];

    return patterns.some((pattern) => pattern.test(input));
  },
};















