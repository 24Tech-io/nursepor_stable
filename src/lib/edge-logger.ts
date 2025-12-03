/**
 * Edge-compatible logger for middleware and other edge runtime environments.
 * Does not use Node.js specific modules like 'path' or 'winston'.
 */

export const securityLogger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, meta?: any) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  },
  logSecurityEvent: (event: string, details: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      event,
      ...details,
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT'
    }));
  },
  logRateLimitExceeded: (ip: string, path: string) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'Rate limit exceeded',
      ip,
      path,
      timestamp: new Date().toISOString(),
      type: 'RATE_LIMIT'
    }));
  },
  logSQLInjectionAttempt: (ip: string, value: string) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'SQL injection attempt detected',
      ip,
      value,
      timestamp: new Date().toISOString(),
      type: 'SQL_INJECTION'
    }));
  },
  logXSSAttempt: (ip: string, value: string) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'XSS attempt detected',
      ip,
      value,
      timestamp: new Date().toISOString(),
      type: 'XSS_ATTEMPT'
    }));
  }
};
