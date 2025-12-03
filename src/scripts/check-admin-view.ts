/**
 * Check what admin is seeing vs what should be displayed
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6;

  console.log('\n📊 ADMIN VIEW ANALYSIS - What should admin see?\n');
  console.log('='.repeat(80) + '\n');

  // 1. Get all enrollments for student 6
  const enrollments = await sql`
    SELECT e.id, e.user_id, e.course_id, e.status as enrollment_status, e.progress,
           c.title, c.status as course_status
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
  `;

  console.log(`✅ ENROLLED COURSES (${enrollments.length}):`);
  if (enrollments.length > 0) {
    enrollments.forEach((e, i) => {
      console.log(`${i + 1}. ${e.title}`);
      console.log(`   Enrollment Status: ${e.enrollment_status}, Progress: ${e.progress}%`);
    });
  } else {
    console.log('   (none)');
  }
  console.log('');

  // 2. Get all requests for student 6
  const requests = await sql`
    SELECT ar.id, ar.student_id, ar.course_id, ar.status as request_status,
           c.title, c.status as course_status, ar.requested_at
    FROM access_requests ar
    JOIN courses c ON ar.course_id = c.id
    WHERE ar.student_id = ${studentId}
    ORDER BY ar.requested_at DESC
  `;

  console.log(`📝 REQUESTS (${requests.length}):`);
  if (requests.length > 0) {
    requests.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   Status: ${r.request_status}, Requested: ${r.requested_at}`);
    });
  } else {
    console.log('   (none)');
  }
  console.log('');

  // 3. Get all courses
  console.log(`📚 ALL PUBLISHED COURSES:`);
  const allCourses = await sql`
    SELECT id, title, status FROM courses 
    WHERE status IN ('published', 'active')
    ORDER BY id
  `;

  allCourses.forEach((c, i) => {
    const isEnrolled = enrollments.some((e) => e.course_id === c.id);
    const hasRequest = requests.some((r) => r.course_id === c.id);
    const requestStatus = requests.find((r) => r.course_id === c.id)?.request_status;

    let displayStatus = 'Available';
    if (isEnrolled) displayStatus = '✅ ENROLLED';
    else if (hasRequest) displayStatus = `📝 ${requestStatus?.toUpperCase()}`;

    console.log(`${i + 1}. ${c.title} - ${displayStatus}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 SUMMARY FOR ADMIN:\n');
  console.log(`Enrolled Courses: ${enrollments.length}`);
  enrollments.forEach((e) => console.log(`  ✅ ${e.title}`));

  console.log(
    `\nPending Requests: ${requests.filter((r) => r.request_status === 'pending').length}`
  );
  requests
    .filter((r) => r.request_status === 'pending')
    .forEach((r) => console.log(`  📝 ${r.title}`));

  console.log(
    `\nApproved Requests (should be enrolled): ${requests.filter((r) => r.request_status === 'approved').length}`
  );
  requests
    .filter((r) => r.request_status === 'approved')
    .forEach((r) => console.log(`  ⚠️  ${r.title}`));

  console.log('\n' + '='.repeat(80) + '\n');

  await sql.end();
}

main();
