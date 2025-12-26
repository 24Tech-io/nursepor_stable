import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  const sql = neon(databaseUrl);
  
  const columns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `;
  
  console.log('\n📋 Users table columns in database:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
  });
  
  console.log('\n🔍 Checking for expected columns:');
  const expectedCols = [
    'fingerprint_enrolled', 'fingerprint_credential_id',
    'two_factor_enabled', 'two_factor_secret', 'two_factor_backup_codes',
    'joined_date', 'reset_token', 'reset_token_expiry', 'otp_secret', 'otp_expiry'
  ];
  
  const existingCols = columns.map(c => c.column_name);
  expectedCols.forEach(col => {
    const exists = existingCols.includes(col);
    console.log(`  ${exists ? '✅' : '❌'} ${col}: ${exists ? 'exists' : 'MISSING'}`);
  });
}

checkSchema();

