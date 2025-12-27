
import 'dotenv/config';
import { getDatabase } from '../src/lib/db/index';
import { sql } from 'drizzle-orm';

async function checkDatabase() {
    console.log('🔍 Checking Database Connection...');
    try {
        const db = getDatabase();

        // 1. Check Connection with a simple query
        const result = await db.execute(sql`SELECT 1`);
        console.log('✅ Database Connection Successful');

        // 2. Check Tables Existence
        const tables = ['users', 'courses', 'notifications', 'access_requests', 'qbank_questions'];
        console.log('\n📊 Checking Tables:');

        for (const table of tables) {
            try {
                await db.execute(sql`SELECT count(*) FROM ${sql.identifier(table)}`);
                console.log(`   ✅ Table '${table}' exists and is accessible`);
            } catch (error: any) {
                console.error(`   ❌ Table '${table}' ERROR: ${error.message}`);
            }
        }

        // 3. Check Q-Bank Questions Count
        try {
            const qCount = await db.execute(sql`SELECT count(*) as count FROM qbank_questions`);
            console.log(`\n📝 Total Q-Bank Questions: ${qCount[0].count}`);
        } catch (e) {
            console.log('   (Could not count questions)');
        }

    } catch (error: any) {
        console.error('❌ Critical Database Error:', error);
    }
    process.exit(0);
}

checkDatabase();
