import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { getDatabase } from '../src/lib/db';
import { sql } from 'drizzle-orm';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });
config({ path: join(process.cwd(), '.env') });

async function runMigration() {
  try {
    console.log('🔄 Starting migration 0020: Add question image and type fields...');
    
    const db = getDatabase();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Read the migration file
    const migrationPath = join(process.cwd(), 'drizzle', '0020_add_question_image_and_type.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration 0020 completed successfully!');
    console.log('   - Added image_url to qbank_questions');
    console.log('   - Added question_type to quiz_questions');
    console.log('   - Added image_url to quiz_questions');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

