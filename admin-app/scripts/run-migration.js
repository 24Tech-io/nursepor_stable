/**
 * Script to run the activity_logs migration
 * This creates the activity_logs table in the database
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please set DATABASE_URL in your .env.local file');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to database...');
    const sql = neon(databaseUrl);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../drizzle/0010_add_activity_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Running migration: 0010_add_activity_logs.sql');
    
    // Execute the migration
    await sql(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   The activity_logs table has been created.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists - this is okay!');
    } else {
      console.error('   Please check your database connection and try again.');
      process.exit(1);
    }
  }
}

runMigration();

