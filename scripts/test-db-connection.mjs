import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  try {
    console.log('🔄 Testing database connection...');
    const sql = neon(databaseUrl);
    
    // Test 1: Simple query
    console.log('Test 1: Simple SELECT');
    const result1 = await sql`SELECT 1 as test`;
    console.log('✅ Simple query works:', result1);
    
    // Test 2: Check if users table exists
    console.log('\nTest 2: Check users table');
    const result2 = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    console.log('✅ Users table columns:', result2.map(r => r.column_name));
    
    // Test 3: Try to select from users
    console.log('\nTest 3: Select from users table');
    const result3 = await sql`SELECT id, email, role FROM users LIMIT 1`;
    console.log('✅ Select query works:', result3);
    
    // Test 4: Try to insert (then delete)
    console.log('\nTest 4: Test insert');
    const testEmail = `test_${Date.now()}@test.com`;
    const insertResult = await sql`
      INSERT INTO users (name, email, password, role, is_active)
      VALUES (${'Test User'}, ${testEmail}, ${'hashed'}, ${'student'}, ${true})
      RETURNING id, email
    `;
    console.log('✅ Insert works:', insertResult);
    
    // Clean up
    if (insertResult[0]?.id) {
      await sql`DELETE FROM users WHERE id = ${insertResult[0].id}`;
      console.log('✅ Cleanup successful');
    }
    
    console.log('\n✅✅✅ All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testConnection();

