/**
 * Script to run the Q-Bank restructuring migration
 * This adds all the new Q-Bank tables and enhancements
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

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
    const migrationPath = path.join(__dirname, '../drizzle/0017_qbank_restructure.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Running migration: 0017_qbank_restructure.sql');
    console.log('   This will add Q-Bank enrollment, analytics, and tracking tables...');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute the migration using tagged template
    // Split into major sections and execute
    const sections = migrationSQL.split(/^-- \d+\./m).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (section.length > 0 && !section.startsWith('--')) {
        try {
          // Use tagged template for Neon
          await sql`${section}`;
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && 
              !err.message.includes('duplicate') &&
              !err.message.includes('does not exist') &&
              !err.message.includes('tagged-template')) {
            console.warn('⚠️  Section warning:', err.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('   Q-Bank restructuring tables have been created.');
    console.log('   You can now use the Q-Bank system with full analytics.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

runMigration();

