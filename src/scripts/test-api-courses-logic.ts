/**
 * Test /api/student/courses endpoint directly
 * This simulates what the frontend calls
 */

import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

(async () => {
    const studentId = 6;

    console.log('\n=== Simulating /api/student/courses queries ===\n');

    // Query 1: From student_progress
    const enrolledProgress = await sql`
    SELECT course_id FROM student_progress WHERE student_id = ${studentId}
  `;
    console.log('Query 1 - studentProgress:', enrolledProgress.length, 'records');
    enrolledProgress.forEach(p => console.log(`  Course ID: ${p.course_id}`));

    // Query 2: From payments (purchased courses)
    const purchasedCourses = await sql`
    SELECT course_id FROM payments 
    WHERE user_id = ${studentId} AND status = 'completed'
  `;
    console.log('\nQuery 2 - payments:', purchasedCourses.length, 'records');
    purchasedCourses.forEach(p => console.log(`  Course ID: ${p.course_id}`));

    // Query 3: From enrollments
    const enrolledRecords = await sql`
    SELECT course_id FROM enrollments
    WHERE user_id = ${studentId} AND status = 'active'
  `;
    console.log('\nQuery 3 - enrollments:', enrolledRecords.length, 'records');
    enrolledRecords.forEach(e => console.log(`  Course ID: ${e.course_id}`));

    // Simulate the Set building
    const enrolledCourseIds = new Set([
        ...enrolledProgress.map((p) => String(p.course_id)),
        ...purchasedCourses.map((p) => String(p.course_id)),
        ...enrolledRecords.map((p) => String(p.course_id)),
    ]);

    console.log('\n=== enrolledCourseIds Set ===');
    console.log('Size:', enrolledCourseIds.size);
    console.log('Contents:', Array.from(enrolledCourseIds));

    // Get all courses
    const allCourses = await sql`
    SELECT id, title, status FROM courses
    WHERE status IN ('published', 'active')
    ORDER BY id
  `;

    console.log('\n=== Course Mapping ===');
    allCourses.forEach(c => {
        const courseIdStr = String(c.id);
        const isEnrolled = enrolledCourseIds.has(courseIdStr);
        console.log(`${c.title} (ID: ${c.id})`);
        console.log(`  String ID: "${courseIdStr}"`);
        console.log(`  In Set: ${isEnrolled}`);
        console.log(`  Status: ${c.status}`);
    });

    console.log('');
    await sql.end();
})();
