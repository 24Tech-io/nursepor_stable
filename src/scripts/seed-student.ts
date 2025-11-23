import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
    console.log('Checking tables in database...');
    try {
        const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
        console.log('Tables found:', result.map(r => r.table_name));

        // Check if users table exists
        const hasUsers = result.some(r => r.table_name === 'users');
        if (hasUsers) {
            console.log('✅ Users table exists');
            // Check columns in users table
            const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `;
            console.log('Users table columns:', columns.map(c => `${c.column_name} (${c.data_type})`));
        } else {
            console.error('❌ Users table MISSING');
        }

    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

checkTables();
