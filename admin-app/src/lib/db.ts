import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './db/schema';

let db: any;

function initializeDatabase() {
  // Check for DATABASE_URL in environment (can be in root .env.local or admin-app/.env.local)
  if (!process.env.DATABASE_URL) {
    console.error('⚠️ DATABASE_URL is not set');
    console.error('   Please set DATABASE_URL in .env.local (root) or admin-app/.env.local');
    console.error('   Example: DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"');
    return null;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql, { schema });
    console.log('✅ Admin Database connection initialized');
    return db;
  } catch (error: any) {
    console.error('❌ Failed to initialize database:', error?.message || error);
    console.error('   Database features will be disabled until DATABASE_URL is properly configured');
    return null;
  }
}

// Initialize on module load
if (typeof window === 'undefined') {
  db = initializeDatabase();
}

export function getDatabase() {
  if (!db) {
    // Try to reinitialize if it failed before
    db = initializeDatabase();
    if (!db) {
      throw new Error('Database is not available. Please check your DATABASE_URL in .env.local (root) or admin-app/.env.local');
    }
  }
  return db;
}

export { db };
