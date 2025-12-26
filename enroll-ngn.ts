
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { users, qbankEnrollments } from './src/lib/db/schema';
import * as schema from './src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

async function main() {
    console.log('Enrolling student in NGN QBank...');

    let db;
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        db = drizzle(pool, { schema });
    } catch (e) {
        console.error('DB Config Error:', e);
        process.exit(1);
    }

    // 1. Find a student
    // Let's pick the first student we find
    const [student] = await db.select().from(users).where(eq(users.role, 'student')).limit(1);
    if (!student) {
        console.error('No student found');
        process.exit(1);
    }
    console.log('Found student:', student.id, student.email);

    // 2. QBank ID 6
    const qbankId = 6;

    // 3. Check if already enrolled
    const [existing] = await db.select().from(qbankEnrollments).where(
        and(
            eq(qbankEnrollments.studentId, student.id),
            eq(qbankEnrollments.qbankId, qbankId)
        )
    ).limit(1);

    if (existing) {
        console.log('Already enrolled. ID:', existing.id);
    } else {
        const [enrollment] = await db.insert(qbankEnrollments).values({
            studentId: student.id,
            qbankId: qbankId
        }).returning();
        console.log('Enrolled! ID:', enrollment.id);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
