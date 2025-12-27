import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkTestAttempts() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        const STUDENT_ID = 16; // student@test.com

        console.log('\n=== Q-BANK TEST ATTEMPTS FOR STUDENT 16 ===\n');

        // Check if qbank_test_attempts table exists
        try {
            const attempts = await db.select().from(schema.qbankTestAttempts).where(eq(schema.qbankTestAttempts.studentId, STUDENT_ID));
            console.log(`Total test attempts: ${attempts.length}`);
            attempts.forEach((a, i) => {
                console.log(`\n${i + 1}. Q-Bank ${a.qbankId}: Score ${a.score}/${a.totalQuestions} (${a.percentage}%)`);
                console.log(`   Started: ${a.startTime}`);
                console.log(`   Status: ${a.status}`);
            });
        } catch (e: any) {
            console.log('No qbank_test_attempts table or no attempts found:', e.message);
        }

        console.log('\n=== Q-BANK QUESTION COUNTS ===\n');
        const qbanks = await db.select({
            id: schema.questionBanks.id,
            name: schema.questionBanks.name,
            status: schema.questionBanks.status
        }).from(schema.questionBanks);

        for (const qbank of qbanks) {
            const questions = await db.select().from(schema.qbankQuestions).where(eq(schema.qbankQuestions.questionBankId, qbank.id));
            console.log(`Q-Bank ${qbank.id}: "${qbank.name}" - ${questions.length} questions (Status: ${qbank.status})`);
        }

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

checkTestAttempts();
