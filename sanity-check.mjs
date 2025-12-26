
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { pgTable, text, serial, boolean } from 'drizzle-orm/pg-core';

// Minimal schema for users
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name'),
    email: text('email'),
    role: text('role'),
    isActive: boolean('is_active'),
});

const schema = { users };

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL not set in process.env");
        process.exit(1);
    }

    console.log("Connecting to DB...");

    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool, { schema });

        console.log("Fetching users...");
        const allUsers = await db.select().from(users).limit(10);

        console.log(`Found ${allUsers.length} users.`);
        // Simple output to avoid table formatting issues if any
        allUsers.forEach(u => {
            console.log(`User: ${u.id} | ${u.email} | ${u.role} | Active: ${u.isActive}`);
        });

    } catch (e) {
        console.error("Failed:", e);
    }
}

main();
