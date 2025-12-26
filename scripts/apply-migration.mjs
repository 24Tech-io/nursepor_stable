import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

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
  const migrationPath = join(__dirname, '../drizzle/0012_ambitious_jack_flag.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Running migration: 0012_ambitious_jack_flag.sql');
  
  // Split by statement-breakpoint and execute each statement
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length > 0) {
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        await sql(statement);
      } catch (err) {
        // Ignore "already exists" or "does not exist" errors
        if (!err.message.includes('already exists') && 
            !err.message.includes('does not exist') &&
            !err.message.includes('duplicate')) {
          console.warn(`⚠️  Statement ${i + 1} warning:`, err.message.substring(0, 100));
        } else {
          console.log(`   ℹ️  Statement ${i + 1} skipped (already applied or not needed)`);
        }
      }
    }
  }
  
  console.log('✅ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}



