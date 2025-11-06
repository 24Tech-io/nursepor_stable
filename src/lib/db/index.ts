import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

let db: any;

function initializeDatabase() {
  // Ensure DATABASE_URL is set for Neon DB
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL environment variable is required. Please set it in .env.local');
    console.error('❌ DATABASE_URL is not set! Please set it in your .env.local file.');
    console.error('   Example: DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"');
    throw error;
  }

  try {
    // Neon Postgres configuration
    neonConfig.fetchConnectionCache = true;
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql, { schema });
    console.log('✅ Database connection initialized (Neon Postgres)');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
}

// Initialize database (will throw if DATABASE_URL is not set)
try {
  db = initializeDatabase();
} catch (error: any) {
  // Don't throw at module load - let it fail when actually used
  console.error('Database initialization error:', error);
  console.error('Error message:', error?.message);
  // db will be undefined, which will cause errors when used
  // This allows the app to start but will fail on first DB operation
}

export { db };
