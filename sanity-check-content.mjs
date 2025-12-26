
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { pgTable, text, serial, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { count } from 'drizzle-orm';

// Minimal schemas
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    role: text('role'),
});

const courses = pgTable('courses', {
    id: serial('id').primaryKey(),
});

const qbankQuestions = pgTable('qbank_questions', {
    id: serial('id').primaryKey(),
});

const schema = { users, courses, qbankQuestions };

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL not set");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    try {
        console.log("Checking content counts...");

        const [userCount] = await db.select({ value: count() }).from(users);
        const [studentCount] = await db.select({ value: count() }).from(users); // Ideally verify role, but count(*) is enough for now
        const [courseCount] = await db.select({ value: count() }).from(courses);
        const [questionCount] = await db.select({ value: count() }).from(qbankQuestions);

        console.log(`Users: ${userCount.value}`);
        console.log(`Courses: ${courseCount.value}`);
        console.log(`Questions: ${questionCount.value}`);

    } catch (e) {
        console.error("Failed:", e);
    }
}

main();
