import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function fullDiagnostic() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        console.log('\n=== FULL Q-BANK DIAGNOSTIC ===\n');

        // 1. All Q-Bank enrollments
        console.log('1. ALL QBANK ENROLLMENTS:');
        const allQbankEnrollments = await db.select().from(schema.qbankEnrollments);
        console.log(`Total: ${allQbankEnrollments.length}`);
        allQbankEnrollments.forEach(e => {
            console.log(`  Student ${e.studentId} -> Q-Bank ${e.qbankId}, Progress: ${e.progress}, Readiness: ${e.readinessScore}`);
        });

        // 2. Check for specific users
        console.log('\n2. STUDENT 16 Q-BANK ENROLLMENTS:');
        const student16Qbanks = await db.select().from(schema.qbankEnrollments).where(eq(schema.qbankEnrollments.studentId, 16));
        console.log(`Count: ${student16Qbanks.length}`);
        student16Qbanks.forEach(e => console.log(`  Q-Bank ${e.qbankId}`));

        console.log('\n3. STUDENT 11 Q-BANK ENROLLMENTS:');
        const student11Qbanks = await db.select().from(schema.qbankEnrollments).where(eq(schema.qbankEnrollments.studentId, 11));
        console.log(`Count: ${student11Qbanks.length}`);
        student11Qbanks.forEach(e => console.log(`  Q-Bank ${e.qbankId}`));

        // 3. Test attempts
        console.log('\n4. TEST ATTEMPTS:');
        try {
            const allAttempts = await db.select().from(schema.qbankTestAttempts);
            console.log(`Total: ${allAttempts.length}`);
            allAttempts.forEach(a => {
                console.log(`  Student ${a.studentId}, Q-Bank ${a.qbankId}: ${a.score}/${a.totalQuestions} (${a.percentage}%)`);
            });
        } catch (e: any) {
            console.log('No qbankTestAttempts table');
        }

        // 4. Published Q-Banks
        console.log('\n5. PUBLISHED Q-BANKS:');
        const publishedQbanks = await db.select({
            id: schema.questionBanks.id,
            name: schema.questionBanks.name,
            status: schema.questionBanks.status,
            isActive: schema.questionBanks.isActive
        }).from(schema.questionBanks).where(eq(schema.questionBanks.status, 'published'));

        console.log(`Count: ${publishedQbanks.length}`);
        publishedQbanks.forEach(q => console.log(`  ID ${q.id}: "${q.name}" (Active: ${q.isActive})`));

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }
    process.exit(0);
}

fullDiagnostic();
