import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { getDatabaseWithRetry } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const db = await getDatabaseWithRetry();
    
    // Test simple query
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as pg_version`);
    console.log('✅ Database connected:', result.rows[0]);
    
    // Test users table
    const users = await db.execute(sql`SELECT COUNT(*)::int as count FROM users`);
    console.log('✅ Users table accessible:', users.rows[0]);
    
    // Test if we can query users
    const sampleUsers = await db.execute(sql`SELECT id, email, role FROM users LIMIT 3`);
    console.log('✅ Sample users:', sampleUsers.rows);
    
    console.log('\n✅✅✅ All database tests passed!');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

