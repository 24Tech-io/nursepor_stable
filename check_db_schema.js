import { getDatabaseWithRetry } from './src/lib/db/index.ts';

async function checkDatabase() {
    console.log('🔍 Checking database schema...\n');

    try {
        const db = await getDatabaseWithRetry();

        // Check if quiz_questions table exists
        const tableCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quiz_questions'
      );
    `);

        console.log('quiz_questions table exists:', tableCheck.rows[0].exists);

        // List all tables in the database
        const allTables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        console.log('\n📋 All tables in database:');
        allTables.rows.forEach(row => console.log('  -', row.table_name));

        // If quiz_questions exists, check its structure
        if (tableCheck.rows[0].exists) {
            const columns = await db.execute(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'quiz_questions'
        ORDER BY ordinal_position;
      `);

            console.log('\n🏗️ quiz_questions table structure:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // Check if there are any quizzes
        const quizCount = await db.execute('SELECT COUNT(*) FROM quizzes;');
        console.log('\n📊 Total quizzes in database:', quizCount.rows[0].count);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Details:', error);
    }

    process.exit(0);
}

checkDatabase();
