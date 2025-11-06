import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

let db: any;

if (process.env.DATABASE_URL) {
  // Neon Postgres
  neonConfig.fetchConnectionCache = true;
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  // SQLite fallback for local development
  const sqlite = new Database('lms.db');
  db = drizzleSqlite(sqlite, { schema });
}

export { db };
