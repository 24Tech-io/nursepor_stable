/**
 * Build-time optimization for database initialization
 * Prevents multiple initialization logs during Next.js build
 */

// Track if database has been initialized (for build-time optimization)
declare global {
  // eslint-disable-next-line no-var
  var dbInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var dbInitAttempted: boolean | undefined;
}

/**
 * Check if we're in build mode
 */
export function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== undefined;
}

/**
 * Should log database initialization
 */
export function shouldLogInit(): boolean {
  // Only log in development or first initialization
  // Use process.env to persist across worker processes
  return process.env.NODE_ENV === 'development' || !process.env.__DB_INITIALIZED__;
}

