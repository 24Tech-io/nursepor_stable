import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function addMissingQuizColumns() {
    try {
        console.log('🔧 Adding missing columns to quizzes table...\n');

        // Add missing columns one by one
        console.log('Adding time_limit...');
        await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER`;
        console.log('✅ time_limit added\n');

        console.log('Adding show_answers...');
        await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS show_answers BOOLEAN DEFAULT true`;
        console.log('✅ show_answers added\n');

        console.log('Adding question_source...');
        await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS question_source TEXT DEFAULT 'legacy'`;
        console.log('✅ question_source added\n');

        console.log('Adding created_at...');
        await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
        console.log('✅ created_at added\n');

        console.log('Adding updated_at...');
        await sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
        console.log('✅ updated_at added\n');

        console.log('🎉 All missing columns added successfully!');
        console.log('\n📋 Verifying final schema...\n');

        const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'quizzes'
      ORDER BY ordinal_position;
    `;

        console.table(result);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addMissingQuizColumns();
