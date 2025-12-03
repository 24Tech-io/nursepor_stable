import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

(async () => {
    const studentId = 6;

    console.log('\n=== DEBUGGING: Why is enrolled section empty? ===\n');

    // Check what's in the database
    const enrollments = await sql`
    SELECT e.*, c.title, c.status as course_status
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
  `;

    console.log(`Database - enrollments table: ${enrollments.length} records`);
    enrollments.forEach(e => {
        console.log(`  - ${e.title} (ID: ${e.course_id})`);
        console.log(`    Enrollment status: ${e.status}`);
        console.log(`    Course status: ${e.course_status}`);
        console.log(`    Progress: ${e.progress}%`);
    });

    const progress = await sql`
    SELECT sp.*, c.title, c.status as course_status
    FROM student_progress sp
    JOIN courses c ON sp.course_id = c.id
    WHERE sp.student_id = ${studentId}
  `;

    console.log(`\nDatabase - student_progress table: ${progress.length} records`);
    progress.forEach(p => {
        console.log(`  - ${p.title} (ID: ${p.course_id})`);
        console.log(`    Course status: ${p.course_status}`);
        console.log(`    Progress: ${p.total_progress}%`);
    });

    // Check requests
    const requests = await sql`
    SELECT ar.*, c.title
    FROM access_requests ar
    JOIN courses c ON ar.course_id = c.id
    WHERE ar.student_id = ${studentId}
  `;

    console.log(`\nDatabase - access_requests table: ${requests.length} records`);
    requests.forEach(r => {
        console.log(`  - ${r.title} (ID: ${r.course_id}, Status: ${r.status})`);
    });

    // Simulate the API query
    console.log('\n=== Simulating /api/student/enrolled-courses query ===\n');

    const apiEnrollments = await sql`
    SELECT e.course_id, e.progress, c.title, c.status
    FROM enrollments e
    INNER JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
    AND e.status = 'active'
    AND (c.status = 'published' OR c.status = 'active')
  `;

    console.log(`API would return: ${apiEnrollments.length} courses`);
    apiEnrollments.forEach(c => {
        console.log(`  - ${c.title} (status: ${c.status})`);
    });

    if (apiEnrollments.length === 0 && enrollments.length > 0) {
        console.log('\n⚠️  PROBLEM FOUND:');
        console.log('  Database has enrollments but API query returns 0');
        console.log('  Likely cause: Course status filter mismatch');
        console.log(`  Course status in DB: "${enrollments[0].course_status}"`);
        console.log('  API filters for: "published" OR "active"');
    }

    console.log('');
    await sql.end();
})();
