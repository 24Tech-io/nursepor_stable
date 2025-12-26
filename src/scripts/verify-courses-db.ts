
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../lib/db/schema'; // Adjust path if needed
import { courses } from '../lib/db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyCourses() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set');
        return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    try {
        console.log('🔍 Querying courses table...');
        const allCourses = await db.select().from(courses);
        console.log(`📚 Found ${allCourses.length} courses:`);

        allCourses.forEach(c => {
            console.log(`- ID: ${c.id}, Title: "${c.title}", Status: "${c.status}", requestable: ${c.isRequestable}`);
        });

    } catch (error) {
        console.error('Error querying courses:', error);
    }
}

verifyCourses();
