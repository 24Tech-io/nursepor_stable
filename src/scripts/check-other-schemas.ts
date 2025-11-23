import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        const tables = ['access_requests', 'student_progress'];

        for (const table of tables) {
            console.log(`\n🔍 Checking ${table} table schema:\n`);
            const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `;
            columns.forEach(c => {
                console.log(`  - ${c.column_name} (${c.data_type})`);
            });
        }

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
