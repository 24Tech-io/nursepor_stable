import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';

async function checkAdminUsers() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log('\n=== ALL USERS ===\n');
    const users = await db.select().from(schema.users).limit(15);

    users.forEach(u => {
        const roleEmoji = u.role === 'admin' ? '👑' : u.role === 'student' ? '👨‍🎓' : '👤';
        console.log(`${roleEmoji} ID ${u.id}: ${u.name}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Role: ${u.role}, Active: ${u.isActive}`);
        console.log('');
    });

    await pool.end();
    process.exit(0);
}

checkAdminUsers();
