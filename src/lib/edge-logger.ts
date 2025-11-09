/**
 * Edge Runtime Compatible Logger
 * Lightweight logger for Next.js Edge Runtime (middleware)
 * Falls back to console logging since winston isn't compatible with Edge Runtime
 */

// Simple logger interface that works in Edge Runtime
export const securityLogger = {
  // Log failed authentication attempts
  logFailedAuth: (ip: string, username: string, reason: string) => {
    console.warn(`[SECURITY] Failed authentication - IP: ${ip}, Username: ${username}, Reason: ${reason}`);
  },

  // Log successful authentication
  logSuccessfulAuth: (ip: string, username: string) => {
    console.info(`[SECURITY] Successful authentication - IP: ${ip}, Username: ${username}`);
  },

  // Log potential SQL injection attempts
  logSQLInjectionAttempt: (ip: string, payload: string) => {
    console.error(`[SECURITY] Potential SQL injection - IP: ${ip}, Payload: ${payload.substring(0, 100)}`);
  },

  // Log potential XSS attempts
  logXSSAttempt: (ip: string, payload: string) => {
    console.error(`[SECURITY] Potential XSS attempt - IP: ${ip}, Payload: ${payload.substring(0, 100)}`);
  },

  // Log rate limit violations
  logRateLimitExceeded: (ip: string, endpoint: string) => {
    console.warn(`[SECURITY] Rate limit exceeded - IP: ${ip}, Endpoint: ${endpoint}`);
  },

  // Log CSRF token validation failures
  logCSRFFailure: (ip: string, endpoint: string) => {
    console.warn(`[SECURITY] CSRF validation failed - IP: ${ip}, Endpoint: ${endpoint}`);
  },

  // Log suspicious file uploads
  logSuspiciousUpload: (ip: string, filename: string, reason: string) => {
    console.warn(`[SECURITY] Suspicious file upload - IP: ${ip}, Filename: ${filename}, Reason: ${reason}`);
  },

  // Log unauthorized access attempts
  logUnauthorizedAccess: (ip: string, endpoint: string, userId?: string) => {
    console.warn(`[SECURITY] Unauthorized access - IP: ${ip}, Endpoint: ${endpoint}, User: ${userId || 'anonymous'}`);
  },

  // Log SSRF attempts
  logSSRFAttempt: (ip: string, targetUrl: string) => {
    console.error(`[SECURITY] Potential SSRF attempt - IP: ${ip}, Target URL: ${targetUrl}`);
  },

  // Generic security event
  logSecurityEvent: (event: string, details: any) => {
    console.warn(`[SECURITY] ${event}`, details);
  },
};

// General logger for Edge Runtime
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
};

export default logger;

