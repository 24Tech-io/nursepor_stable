/**
 * Quick fix test - Check getPublishedCourseFilter function
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6;

  console.log('\n🔍 QUICK DIAGNOSTIC\n');

  // What's the actual course status?
  const courses = await sql`
    SELECT e.course_id, c.title, c.status, e.status as enrollment_status
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
  `;

  console.log('Enrolled courses in DB:');
  courses.forEach((c) => {
    console.log(`  - "${c.title}"`);
    console.log(`    Course status: "${c.status}" (${typeof c.status})`);
    console.log(`    Enrollment status: "${c.enrollment_status}"`);
  });

  console.log('\n');

  // Test query WITH published filter
  const withFilter = await sql`
    SELECT e.course_id, c.title
    FROM enrollments e
    INNER JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
    AND e.status = 'active'
    AND (c.status = 'published' OR c.status = 'Published' OR c.status = 'active' OR c.status = 'Active')
  `;

  console.log(`Query with published filter: ${withFilter.length} courses`);
  withFilter.forEach((c) => console.log(`  - "${c.title}"`));

  await sql.end();
}

main();
