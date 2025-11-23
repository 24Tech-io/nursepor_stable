import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        console.log('\n🔍 Checking enrollments table schema:\n');

        const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'enrollments'
      ORDER BY ordinal_position
    `;

        console.log('Columns in enrollments table:');
        columns.forEach(c => {
            console.log(`  - ${c.column_name} (${c.data_type} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        console.log('\n🔍 Sample enrollments data:\n');
        const enrollments = await sql`SELECT * FROM enrollments LIMIT 3`;
        console.log(`Found ${enrollments.length} enrollment records`);
        enrollments.forEach((e, i) => {
            console.log(`\nEnrollment ${i + 1}:`);
            Object.entries(e).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });
        });

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
