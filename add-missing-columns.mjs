import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function addMissingColumns() {
    try {
        // Add all missing columns one by one
        console.log('Adding description...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS description TEXT`;
        console.log('✅ description added\n');

        console.log('Adding is_published...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true`;
        console.log('✅ is_published added\n');

        console.log('Adding prerequisite_chapter_id...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS prerequisite_chapter_id INTEGER`;
        console.log('✅ prerequisite_chapter_id added\n');

        console.log('Adding video_url...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS video_url TEXT`;
        console.log('✅ video_url added\n');

        console.log('Adding video_provider...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS video_provider TEXT`;
        console.log('✅ video_provider added\n');

        console.log('Adding video_duration...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS video_duration INTEGER`;
        console.log('✅ video_duration added\n');

        console.log('Adding transcript...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS transcript TEXT`;
        console.log('✅ transcript added\n');

        console.log('Adding textbook_content...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS textbook_content TEXT`;
        console.log('✅ textbook_content added\n');

        console.log('Adding textbook_file_url...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS textbook_file_url TEXT`;
        console.log('✅ textbook_file_url added\n');

        console.log('Adding reading_time...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS reading_time INTEGER`;
        console.log('✅ reading_time added\n');

        console.log('Adding mcq_data...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS mcq_data TEXT`;
        console.log('✅ mcq_data added\n');

        console.log('Adding created_at...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
        console.log('✅ created_at added\n');

        console.log('Adding updated_at...');
        await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
        console.log('✅ updated_at added\n');

        console.log('🎉 All missing columns added successfully!');
        console.log('\n📋 Verifying final schema...\n');

        const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chapters'
      ORDER BY ordinal_position;
    `;

        console.table(result);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addMissingColumns();
