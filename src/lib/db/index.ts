import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { retry } from '@/lib/retry';

let db: any;
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let isHealthy: boolean = true;

function initializeDatabase() {
  // Ensure DATABASE_URL is set for Neon DB
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL is not set! Database features will be disabled.');
    console.warn('   Please set DATABASE_URL in .env.local');
    console.warn('   Example: DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"');
    return null;
  }

  try {
    // Neon Postgres configuration with optimized settings
    // Using neon-serverless with Pool for transaction support
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { 
      schema,
      // Optimize for performance
      logger: process.env.NODE_ENV === 'development' ? true : false,
    });
    console.log('✅ Database connection initialized (Neon Postgres - Serverless with Transaction Support)');
    return db;
  } catch (error: any) {
    console.error('❌ Failed to initialize database connection:', error?.message || error);
    console.error('   Database features will be disabled until DATABASE_URL is properly configured');
    return null;
  }
}

// Initialize database - safe initialization that won't crash the app
// This allows the app to start even if DATABASE_URL is missing or invalid
db = initializeDatabase();

/**
 * Check database health by running a simple query
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!db) {
    isHealthy = false;
    return false;
  }

  try {
    // Run a simple query to check connection
    await db.execute(sql`SELECT 1`);
    isHealthy = true;
    lastHealthCheck = Date.now();
    return true;
  } catch (error: any) {
    console.error('❌ Database health check failed:', error.message);
    isHealthy = false;
    lastHealthCheck = Date.now();
    return false;
  }
}

/**
 * Get database health status (cached)
 */
export async function getDatabaseHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached result if recent
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isHealthy;
  }

  // Perform fresh health check
  return await checkDatabaseHealth();
}

/**
 * Reinitialize database connection (for recovery)
 */
export async function reconnectDatabase(): Promise<boolean> {
  try {
    console.log('🔄 Attempting to reconnect database...');
    db = initializeDatabase();
    
    if (db) {
      const healthy = await checkDatabaseHealth();
      if (healthy) {
        console.log('✅ Database reconnected successfully');
        return true;
      }
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Database reconnection failed:', error.message);
    return false;
  }
}

// Helper function to check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null && db !== undefined;
}

// Helper function to get database or throw error
export function getDatabase() {
  if (!db) {
    throw new Error('Database is not available. Please check your DATABASE_URL in .env.local');
  }
  return db;
}

/**
 * Get database with automatic retry on connection failure
 */
export async function getDatabaseWithRetry() {
  if (!db) {
    // Try to reconnect
    const reconnected = await reconnectDatabase();
    if (!reconnected) {
      throw new Error('Database is not available. Please check your DATABASE_URL in .env.local');
    }
  }

  // Check health and reconnect if needed
  const healthy = await getDatabaseHealth();
  if (!healthy && db) {
    console.warn('⚠️ Database health check failed, attempting reconnection...');
    await reconnectDatabase();
  }

  if (!db) {
    throw new Error('Database is not available. Please check your DATABASE_URL in .env.local');
  }

  return db;
}

export { db };
