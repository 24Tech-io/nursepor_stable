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
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to database...');
    const sql = neon(databaseUrl);
    
    console.log('📝 Running migration: 0016_remove_face_login.sql');
    console.log('   Dropping face_id_enrolled and face_template columns...');
    
    // Execute the migration - run each statement separately
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS face_id_enrolled`;
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS face_template`;
    
    console.log('✅ Migration completed successfully!');
    console.log('   Face login columns have been removed from the users table.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('does not exist') || 
        (error.message.includes('column') && error.message.includes('does not exist'))) {
      console.log('ℹ️  Columns may already be removed - this is okay!');
      process.exit(0);
    } else {
      console.error('   Error details:', error);
      process.exit(1);
    }
  }
}

runMigration();

