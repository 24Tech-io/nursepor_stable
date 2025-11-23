/**
 * Script to create the activity_logs table
 * Run this with: node admin-app/scripts/create-activity-logs-table.js
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createActivityLogsTable() {
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
    
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    for (const statement of statements) {
      if (statement) {
        await sql(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   The activity_logs table has been created.');
    
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists - this is okay!');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('   Error details:', error);
      process.exit(1);
    }
  }
}

createActivityLogsTable();

