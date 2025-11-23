
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        console.log('\n🔍 Latest Access Requests:\n');

        const requests = await sql`
      SELECT ar.id, ar.student_id, ar.course_id, ar.status, 
             ar.requested_at, ar.reviewed_at, ar.reviewed_by,
             u.name as student_name, c.title as course_title
      FROM access_requests ar
      LEFT JOIN users u ON ar.student_id = u.id
      LEFT JOIN courses c ON ar.course_id = c.id
      ORDER BY ar.requested_at DESC
      LIMIT 5
    `;

        requests.forEach(r => {
            console.log(`Request #${r.id}:`);
            console.log(`  Student: ${r.student_name} (ID: ${r.student_id})`);
            console.log(`  Course: ${r.course_title} (ID: ${r.course_id})`);
            console.log(`  Status: ${r.status.toUpperCase()}`);
            console.log(`  Requested: ${r.requested_at}`);
            console.log(`  Reviewed: ${r.reviewed_at || 'Not yet'}`);
            console.log(`  Reviewed By: ${r.reviewed_by || 'N/A'}`);
            console.log('');
        });

        // Check enrollments for the latest request
        if (requests.length > 0) {
            const latest = requests[0];
            console.log(`\n🔍 Checking enrollment for latest request #${latest.id}:\n`);

            const enrollments = await sql`
        SELECT e.id, e.status, e.enrolled_at
        FROM enrollments e
        WHERE e.user_id = ${latest.student_id} AND e.course_id = ${latest.course_id}
      `;

            if (enrollments.length > 0) {
                console.log(`✅ Enrollment exists:`);
                enrollments.forEach(e => {
                    console.log(`  - Enrollment #${e.id}: ${e.status}, enrolled: ${e.enrolled_at}`);
                });
            } else {
                console.log(`❌ NO enrollment found for student ${latest.student_id}, course ${latest.course_id}`);
            }

            const progress = await sql`
        SELECT sp.id
        FROM student_progress sp
        WHERE sp.student_id = ${latest.student_id} AND sp.course_id = ${latest.course_id}
      `;

            if (progress.length > 0) {
                console.log(`✅ Progress record exists: #${progress[0].id}`);
            } else {
                console.log(`❌ NO progress record found`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
