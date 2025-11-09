/**
 * Security Logging Configuration
 * Winston logger for tracking security events, failed auth attempts, and suspicious activity
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for log messages
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports to use
const transports = [
  // Console transport
  new winston.transports.Console(),
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // File transport for all logs
  new winston.transports.File({ 
    filename: 'logs/combined.log',
  }),
  // Security-specific log file
  new winston.transports.File({ 
    filename: 'logs/security.log',
    level: 'warn',
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});

// Security-specific logging functions
export const securityLogger = {
  // Log failed authentication attempts
  logFailedAuth: (ip: string, username: string, reason: string) => {
    logger.warn(`Failed authentication attempt - IP: ${ip}, Username: ${username}, Reason: ${reason}`);
  },

  // Log successful authentication
  logSuccessfulAuth: (ip: string, username: string) => {
    logger.info(`Successful authentication - IP: ${ip}, Username: ${username}`);
  },

  // Log potential SQL injection attempts
  logSQLInjectionAttempt: (ip: string, payload: string) => {
    logger.error(`Potential SQL injection attempt - IP: ${ip}, Payload: ${payload.substring(0, 100)}`);
  },

  // Log potential XSS attempts
  logXSSAttempt: (ip: string, payload: string) => {
    logger.error(`Potential XSS attempt - IP: ${ip}, Payload: ${payload.substring(0, 100)}`);
  },

  // Log rate limit violations
  logRateLimitExceeded: (ip: string, endpoint: string) => {
    logger.warn(`Rate limit exceeded - IP: ${ip}, Endpoint: ${endpoint}`);
  },

  // Log CSRF token validation failures
  logCSRFFailure: (ip: string, endpoint: string) => {
    logger.warn(`CSRF validation failed - IP: ${ip}, Endpoint: ${endpoint}`);
  },

  // Log suspicious file uploads
  logSuspiciousUpload: (ip: string, filename: string, reason: string) => {
    logger.warn(`Suspicious file upload - IP: ${ip}, Filename: ${filename}, Reason: ${reason}`);
  },

  // Log unauthorized access attempts
  logUnauthorizedAccess: (ip: string, endpoint: string, userId?: string) => {
    logger.warn(`Unauthorized access attempt - IP: ${ip}, Endpoint: ${endpoint}, User: ${userId || 'anonymous'}`);
  },

  // Log SSRF attempts
  logSSRFAttempt: (ip: string, targetUrl: string) => {
    logger.error(`Potential SSRF attempt - IP: ${ip}, Target URL: ${targetUrl}`);
  },

  // Generic security event
  logSecurityEvent: (event: string, details: any) => {
    logger.warn(`Security Event: ${event}`, details);
  },
};

export default logger;

