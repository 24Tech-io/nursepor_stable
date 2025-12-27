import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

// Force reload process.env
console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';

async function run() {
    try {
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL not set!');
            process.exit(1);
        }

        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        console.log('\n=== ENROLLMENTS ===');
        const allEnrollments = await db.select().from(schema.enrollments);
        console.log('Total enrollments:', allEnrollments.length);
        allEnrollments.forEach(e => {
            console.log(`  User ${e.userId} -> Course ${e.courseId}, Status: ${e.status}, Progress: ${e.progress}`);
        });

        console.log('\n=== Q-BANK ENROLLMENTS ===');
        const allQbankEnrollments = await db.select().from(schema.qbankEnrollments);
        console.log('Total Q-Bank enrollments:', allQbankEnrollments.length);
        allQbankEnrollments.forEach(e => {
            console.log(`  Student ${e.studentId} -> Q-Bank ${e.qbankId}, Progress: ${e.progress}`);
        });

        console.log('\n=== USERS ===');
        const allUsers = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role }).from(schema.users);
        console.log('Total users:', allUsers.length);
        allUsers.forEach(u => {
            console.log(`  ID ${u.id}: ${u.name} (${u.email}) - Role: ${u.role}`);
        });

        console.log('\n=== COURSES ===');
        const allCourses = await db.select({ id: schema.courses.id, title: schema.courses.title, status: schema.courses.status }).from(schema.courses);
        console.log('Total courses:', allCourses.length);
        allCourses.forEach(c => {
            console.log(`  ID ${c.id}: "${c.title}" - Status: ${c.status}`);
        });

        console.log('\n=== QUESTION BANKS ===');
        const allQbanks = await db.select({ id: schema.questionBanks.id, name: schema.questionBanks.name, status: schema.questionBanks.status, isActive: schema.questionBanks.isActive }).from(schema.questionBanks);
        console.log('Total Q-Banks:', allQbanks.length);
        allQbanks.forEach(q => {
            console.log(`  ID ${q.id}: "${q.name}" - Status: ${q.status}, Active: ${q.isActive}`);
        });

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
        console.error(e.stack);
    }
    process.exit(0);
}

run();
