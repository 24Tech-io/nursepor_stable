import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function verifyQBankData() {
  console.log('🔍 Verifying Q-Bank Data (Raw SQL)...');

  try {
    const qbanks = await db.execute(sql`SELECT * FROM question_banks`);
    console.log('Question Banks:', qbanks.rows);

    const questions = await db.execute(
      sql`SELECT count(*) as count, test_type FROM qbank_questions GROUP BY test_type`
    );
    console.log('Question Counts:', questions.rows);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyQBankData();
