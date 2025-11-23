
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        const all = await sql`
      SELECT ar.id, ar.student_id, ar.course_id, ar.status, 
             c.title as course_title
      FROM access_requests ar
      LEFT JOIN courses c ON ar.course_id = c.id
      ORDER BY ar.id DESC
    `;

        console.log(`\nTotal requests: ${all.length}\n`);
        all.forEach(r => {
            console.log(`#${r.id}: ${r.status.padEnd(10)} Student=${r.student_id} Course=${r.course_id} ("${r.course_title}")`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
