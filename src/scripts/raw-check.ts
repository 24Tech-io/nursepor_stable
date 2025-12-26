import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  try {
    console.log('Connecting to DB with postgres driver...');
    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'courses'
    `;
    console.log(
      'Courses table columns:',
      columns.map((c) => c.column_name)
    );

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
