import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

let db: any;

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
    // fetchConnectionCache is enabled by default for connection pooling
    // Using neon-http for better performance in serverless environments
    const sql = neon(process.env.DATABASE_URL, {
      fetchConnectionCache: true, // Enable connection caching for faster queries
    });
    db = drizzle(sql, { 
      schema,
      // Optimize for performance
      logger: process.env.NODE_ENV === 'development' ? true : false,
    });
    console.log('✅ Database connection initialized (Neon Postgres - Optimized)');
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

export { db };
