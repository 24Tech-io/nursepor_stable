
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        console.log('\n✅ Current state for User ID 6:\n');

        const requests = await sql`
      SELECT ar.id, ar.status, c.title as course_title 
      FROM access_requests ar
      JOIN courses c ON ar.course_id = c.id
      WHERE ar.student_id = 6
    `;
        console.log(`Access Requests: ${requests.length}`);
        requests.forEach(r => {
            console.log(`  - Request #${r.id}: [${r.status.toUpperCase()}] for "${r.course_title}"`);
        });

        const enrollments = await sql`
      SELECT e.id, e.status, c.title as course_title
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = 6
    `;
        console.log(`\nEnrollments: ${enrollments.length}`);
        enrollments.forEach(e => {
            console.log(`  - Enrollment #${e.id}: [${e.status.toUpperCase()}] for "${e.course_title}"`);
        });

        const progress = await sql`
      SELECT sp.id, c.title as course_title
      FROM student_progress sp
      JOIN courses c ON sp.course_id = c.id
      WHERE sp.student_id = 6
    `;
        console.log(`\nProgress Records: ${progress.length}`);
        progress.forEach(p => {
            console.log(`  - Progress #${p.id}: for "${p.course_title}"`);
        });

        console.log('\n✅ User should now see the course as enrolled!\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
