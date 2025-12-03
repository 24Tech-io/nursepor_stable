import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  try {
    console.log('Connecting to DB to fix schema...');
    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    // Check if is_public column exists
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'is_public'
    `;

    if (columns.length === 0) {
      console.log('⚠️ is_public column missing. Adding it...');
      await sql`ALTER TABLE courses ADD COLUMN is_public boolean NOT NULL DEFAULT false`;
      console.log('✅ Added is_public column.');
    } else {
      console.log('✅ is_public column already exists.');
    }

    // Check if is_requestable column exists (just in case)
    const reqColumns = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'is_requestable'
    `;

    if (reqColumns.length === 0) {
      console.log('⚠️ is_requestable column missing. Adding it...');
      await sql`ALTER TABLE courses ADD COLUMN is_requestable boolean NOT NULL DEFAULT true`;
      console.log('✅ Added is_requestable column.');
    } else {
      console.log('✅ is_requestable column already exists.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fixing schema:', error);
    process.exit(1);
  }
}

main();
