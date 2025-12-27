import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function fixEnrollments() {
    try {
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL not set!');
            process.exit(1);
        }

        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        const STUDENT_ID = 16; // student@test.com

        console.log('Adding enrollments for student@test.com (ID 16)...\n');

        // 1. Add course enrollment for Course 1 (Nurse Pro)
        console.log('1. Adding course enrollment for Course 1...');
        try {
            await db.insert(schema.enrollments).values({
                userId: STUDENT_ID,
                courseId: 1,
                status: 'active',
                progress: 25,
                enrolledAt: new Date(),
            });
            console.log('   ✅ Course enrollment added');
        } catch (e: any) {
            if (e.message.includes('duplicate') || e.message.includes('unique')) {
                console.log('   ⚠️ Already enrolled');
            } else {
                console.log('   ❌ Error:', e.message);
            }
        }

        // 2. Add Q-Bank enrollments for published Q-Banks
        const qbanksToEnroll = [1, 3, 4]; // NCLEX-RN Practice, Advanced Pharmacology

        for (const qbankId of qbanksToEnroll) {
            console.log(`2. Adding Q-Bank enrollment for Q-Bank ${qbankId}...`);
            try {
                await db.insert(schema.qbankEnrollments).values({
                    studentId: STUDENT_ID,
                    qbankId: qbankId,
                    enrolledAt: new Date(),
                    progress: 0,
                    readinessScore: 0,
                });
                console.log(`   ✅ Q-Bank ${qbankId} enrollment added`);
            } catch (e: any) {
                if (e.message.includes('duplicate') || e.message.includes('unique')) {
                    console.log(`   ⚠️ Already enrolled in Q-Bank ${qbankId}`);
                } else {
                    console.log(`   ❌ Error:`, e.message);
                }
            }
        }

        // 3. Verify
        console.log('\n=== VERIFICATION ===');
        const enrollments = await db.select().from(schema.enrollments).where(eq(schema.enrollments.userId, STUDENT_ID));
        console.log('Course enrollments:', enrollments.length);
        enrollments.forEach(e => console.log(`  Course ${e.courseId}: ${e.status}, Progress: ${e.progress}`));

        const qbankEnrollments = await db.select().from(schema.qbankEnrollments).where(eq(schema.qbankEnrollments.studentId, STUDENT_ID));
        console.log('Q-Bank enrollments:', qbankEnrollments.length);
        qbankEnrollments.forEach(e => console.log(`  Q-Bank ${e.qbankId}: Progress: ${e.progress}`));

        await pool.end();
        console.log('\n✅ Done! Refresh the student dashboard to see the data.');
    } catch (e: any) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }
    process.exit(0);
}

fixEnrollments();
