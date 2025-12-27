import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../src/lib/db/schema';

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log('\n=== COURSE STATUS CHECK ===\n');
    const courses = await db.select().from(schema.courses);
    courses.forEach(c => {
        console.log(`Course ID ${c.id}: "${c.title}"`);
        console.log(`  Status: "${c.status}"`);
        console.log(`  Published: ${c.status === 'published' || c.status === 'active' ? 'YES' : 'NO'}`);
    });

    console.log('\n=== Q-BANK STATUS CHECK ===\n');
    const qbanks = await db.select().from(schema.questionBanks);
    qbanks.forEach(q => {
        console.log(`Q-Bank ID ${q.id}: "${q.name}"`);
        console.log(`  Status: "${q.status}", Active: ${q.isActive}`);
        console.log(`  Published: ${q.status === 'published' && q.isActive ? 'YES' : 'NO'}`);
    });

    await pool.end();
    process.exit(0);
}

check();
