/**
 * Logger Helper
 * Provides easy access to logger with automatic environment detection
 * Use this instead of console.log/error/warn
 */

import { logger } from './logger';

// Check if we're in edge runtime (no Node.js modules)
const isEdgeRuntime = typeof process === 'undefined' || !process.versions?.node;

/**
 * Get appropriate logger based on runtime
 * - Node.js runtime: Use Winston logger
 * - Edge runtime: Use structured console (JSON format)
 */
export const getLogger = () => {
  if (isEdgeRuntime) {
    // Edge runtime - use structured console
    return {
      debug: (message: string, meta?: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(JSON.stringify({ level: 'debug', message, ...meta, timestamp: new Date().toISOString() }));
        }
      },
      info: (message: string, meta?: any) => {
        console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
      },
      warn: (message: string, meta?: any) => {
        console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
      },
      error: (message: string, error?: Error | any, meta?: any) => {
        const errorData = error instanceof Error 
          ? { message: error.message, stack: error.stack, name: error.name }
          : error;
        console.error(JSON.stringify({ 
          level: 'error', 
          message, 
          error: errorData,
          ...meta, 
          timestamp: new Date().toISOString() 
        }));
      },
    };
  }
  
  // Node.js runtime - use Winston
  return logger;
};

// Export singleton instance
export const appLogger = getLogger();

// Convenience exports
export const log = {
  debug: (message: string, meta?: any) => appLogger.debug(message, meta),
  info: (message: string, meta?: any) => appLogger.info(message, meta),
  warn: (message: string, meta?: any) => appLogger.warn(message, meta),
  error: (message: string, error?: Error | any, meta?: any) => appLogger.error(message, error, meta),
};

