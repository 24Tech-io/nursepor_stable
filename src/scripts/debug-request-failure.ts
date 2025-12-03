import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

(async () => {
    const studentId = 6;
    const courseId = 10;

    console.log('\n=== DEBUGGING REQUEST FAILURE ===\n');

    // Check enrollments
    const enrollments = await sql`
    SELECT * FROM enrollments
    WHERE user_id = ${studentId} AND course_id = ${courseId}
  `;
    console.log(`Enrollments for student ${studentId}, course ${courseId}: ${enrollments.length}`);
    if (enrollments.length > 0) {
        console.log('  Status:', enrollments[0].status);
    }

    // Check studentProgress
    const progress = await sql`
    SELECT * FROM student_progress
    WHERE student_id = ${studentId} AND course_id = ${courseId}
  `;
    console.log(`\nstudentProgress for student ${studentId}, course ${courseId}: ${progress.length}`);

    // Check existing requests
    const requests = await sql`
    SELECT * FROM access_requests
    WHERE student_id = ${studentId} AND course_id = ${courseId}
  `;
    console.log(`\nExisting requests: ${requests.length}`);
    requests.forEach(r => {
        console.log(`  - Request ID: ${r.id}, Status: ${r.status}, Requested: ${r.requested_at}`);
    });

    // Check if course exists
    const course = await sql`SELECT id, title FROM courses WHERE id = ${courseId}`;
    console.log(`\nCourse ${courseId}: ${course.length > 0 ? course[0].title : 'NOT FOUND'}`);

    console.log('\n=== TEST INSERT ===\n');
    try {
        const result = await sql`
      INSERT INTO access_requests (student_id, course_id, reason, status)
      VALUES (${studentId}, ${courseId}, 'Test request', 'pending')
      RETURNING id, status
    `;
        console.log('✅ INSERT SUCCESS:', result[0]);

        // Delete it
        await sql`DELETE FROM access_requests WHERE id = ${result[0].id}`;
        console.log('✅ Test request deleted');
    } catch (error) {
        console.log('❌ INSERT FAILED:', error.message);
        console.log('Error details:', error);
    }

    console.log('');
    await sql.end();
})();
