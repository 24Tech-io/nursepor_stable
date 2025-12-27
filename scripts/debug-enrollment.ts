import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function debugEnrollment() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        const STUDENT_ID = 16;

        console.log('\n=== DEBUGGING ENROLLMENT DETECTION ===\n');

        // 1. Check enrollments table
        console.log('1. ENROLLMENTS TABLE:');
        const enrollments = await db.select().from(schema.enrollments).where(eq(schema.enrollments.userId, STUDENT_ID));
        console.log(`Found ${enrollments.length} enrollments`);
        enrollments.forEach(e => {
            console.log(`  - Course ${e.courseId}: status="${e.status}", progress=${e.progress}`);
        });

        // 2. Check studentProgress table  
        console.log('\n2. STUDENT_PROGRESS TABLE:');
        try {
            const progress = await db.select().from(schema.studentProgress).where(eq(schema.studentProgress.studentId, STUDENT_ID));
            console.log(`Found ${progress.length} progress records`);
            progress.forEach(p => {
                console.log(`  - Course ${p.courseId}: progress=${p.totalProgress}`);
            });
        } catch (e: any) {
            console.log('  Table not accessible:', e.message);
        }

        // 3. What the API query should find
        console.log('\n3. WHAT API SHOULD RETURN:');
        console.log('Query: enrollments where userId=16 AND status="active"');
        const apiQuery = await db.select({ courseId: schema.enrollments.courseId })
            .from(schema.enrollments)
            .where(
                and(
                    eq(schema.enrollments.userId, STUDENT_ID),
                    eq(schema.enrollments.status, 'active')
                )
            );
        console.log(`Result: ${apiQuery.length} courses`);
        apiQuery.forEach(r => console.log(`  - Course ID: ${r.courseId}`));

        // 4. Check access requests
        console.log('\n4. ACCESS REQUESTS:');
        const requests = await db.select().from(schema.accessRequests).where(eq(schema.accessRequests.studentId, STUDENT_ID));
        console.log(`Found ${requests.length} requests`);
        requests.forEach(r => {
            console.log(`  - Course ${r.courseId}: status="${r.status}"`);
        });

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

debugEnrollment();
