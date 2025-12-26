process.env.DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7MNOQ3yoFvdHBItigGcCmT@ep-lively-glitter-a5214041-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Checking database connection...');
    const result = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log(
      'Tables found:',
      result.rows.map((r: any) => r.table_name)
    );

    // If courses table exists, count rows
    const coursesTable = result.rows.find((r: any) => r.table_name === 'courses');
    if (coursesTable) {
      const count = await db.execute(sql`SELECT count(*) FROM courses`);
      console.log('Courses count:', count.rows[0]);
    } else {
      console.log('Courses table NOT found!');
    }
  } catch (error) {
    console.error('Error checking DB:', error);
  }
  process.exit(0);
}

main();
