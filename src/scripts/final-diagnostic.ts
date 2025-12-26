/**
 * Final diagnostic - show EXACT API response vs database state
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6;

  console.log('\n' + '='.repeat(80));
  console.log('FINAL DIAGNOSTIC');
  console.log('='.repeat(80) + '\n');

  // SIMULATE EXACT API QUERY - studentProgress part
  console.log('1. STUDENT PROGRESS QUERY (from enrolled-courses API):');
  const progressQuery = await sql`
    SELECT sp.course_id, sp.total_progress, sp.last_accessed,
           c.id, c.title, c.description, c.instructor, c.thumbnail, c.pricing, c.status
    FROM student_progress sp
    INNER JOIN courses c ON sp.course_id = c.id
    WHERE sp.student_id = ${studentId}
    AND (c.status = 'published' OR c.status = 'active')
  `;
  console.log(`   Results: ${progressQuery.length} courses`);
  progressQuery.forEach((c) => {
    console.log(`   - ${c.title} (ID: ${c.course_id}, Status: ${c.status})`);
  });
  console.log('');

  // SIMULATE EXACT API QUERY - enrollments part
  console.log('2. ENROLLMENTS QUERY (from enrolled-courses API):');
  const enrollmentsQuery = await sql`
    SELECT e.course_id, e.progress, e.updated_at,
           c.id, c.title, c.description, c.instructor, c.thumbnail, c.pricing, c.status
    FROM enrollments e
    INNER JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
    AND e.status = 'active'
    AND (c.status = 'published' OR c.status = 'active')
  `;
  console.log(`   Results: ${enrollmentsQuery.length} courses`);
  enrollmentsQuery.forEach((c) => {
    console.log(
      `   - ${c.title} (ID: ${c.course_id}, Status: ${c.status}, Progress: ${c.progress}%)`
    );
  });
  console.log('');

  // Merge simulation
  console.log('3. MERGED RESULTS (what API should return):');
  const mergedCourseIds = new Set([
    ...progressQuery.map((c) => c.course_id),
    ...enrollmentsQuery.map((c) => c.course_id),
  ]);
  console.log(`   Total unique courses: ${mergedCourseIds.size}`);
  mergedCourseIds.forEach((id) => {
    const fromProgress = progressQuery.find((c) => c.course_id === id);
    const fromEnrollments = enrollmentsQuery.find((c) => c.course_id === id);
    const title = (fromEnrollments || fromProgress)?.title;
    const source = fromEnrollments
      ? fromProgress
        ? 'BOTH'
        : 'enrollments only'
      : 'studentProgress only';
    console.log(`   - ${title} (source: ${source})`);
  });
  console.log('');

  // Check pending requests
  console.log('4. PENDING REQUESTS (these get filtered OUT):');
  const pendingRequests = await sql`
    SELECT ar.course_id, c.title
    FROM access_requests ar
    JOIN courses c ON ar.course_id = c.id
    WHERE ar.student_id = ${studentId}
    AND ar.status = 'pending'
  `;
  console.log(`   Results: ${pendingRequests.length} pending requests`);
  if (pendingRequests.length > 0) {
    pendingRequests.forEach((r) => {
      console.log(`   - ${r.title} (Course ID: ${r.course_id})`);
    });
  } else {
    console.log(`   (none)`);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ Diagnostic complete\n');

  await sql.end();
}

main();
