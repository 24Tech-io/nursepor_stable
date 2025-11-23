/**
 * Simple migration script to create activity_logs table
 * Usage: node admin-app/scripts/migrate-activity-logs.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

const migrationSQL = `
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "admin_id" integer NOT NULL,
  "admin_name" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" integer,
  "entity_name" text,
  "details" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_id_users_id_fk" 
  FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    const sql = neon(DATABASE_URL);
    
    console.log('📝 Creating activity_logs table...');
    
    // Execute the migration
    await sql(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   The activity_logs table has been created.');
    
  } catch (error) {
    if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
      console.log('ℹ️  Table or constraint already exists - this is okay!');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('   Full error:', error);
      process.exit(1);
    }
  }
}

runMigration();

