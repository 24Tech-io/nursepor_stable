/**
 * ROLLBACK: Delete incorrectly created enrollment
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6;
  const courseId = 10; // Pharmacology Essentials

  console.log('\n🔄 ROLLING BACK INCORRECT ENROLLMENT\n');

  try {
    // Check what exists
    console.log('Checking current state...\n');

    const enrollment = await sql`
      SELECT * FROM enrollments WHERE user_id = ${studentId} AND course_id = ${courseId}
    `;

    const request = await sql`
      SELECT * FROM access_requests WHERE student_id = ${studentId} AND course_id = ${courseId}
    `;

    console.log(`Enrollment record: ${enrollment.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    if (enrollment.length > 0) {
      console.log(
        `  - ID: ${enrollment[0].id}, Status: ${enrollment[0].status}, Progress: ${enrollment[0].progress}%`
      );
    }

    console.log(`Request record: ${request.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    if (request.length > 0) {
      console.log(`  - ID: ${request[0].id}, Status: ${request[0].status}`);
    }

    console.log('');

    // Delete the enrollment record if it exists
    if (enrollment.length > 0) {
      const deleted = await sql`
        DELETE FROM enrollments 
        WHERE user_id = ${studentId} AND course_id = ${courseId}
        RETURNING id
      `;

      console.log(`✅ Deleted enrollment record #${deleted[0].id}\n`);
    } else {
      console.log('⚠️  No enrollment to delete\n');
    }

    // Verify final state
    console.log('Final state for student 6:\n');
    const finalEnrollments = await sql`
      SELECT e.course_id, c.title FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId}
    `;

    const finalRequests = await sql`
      SELECT ar.course_id, ar.status, c.title FROM access_requests ar
      JOIN courses c ON ar.course_id = c.id
      WHERE ar.student_id = ${studentId}
    `;

    console.log(`Enrollments: ${finalEnrollments.length}`);
    finalEnrollments.forEach((e) => console.log(`  - ${e.title}`));

    console.log(`\nRequests: ${finalRequests.length}`);
    finalRequests.forEach((r) => console.log(`  - ${r.title} (${r.status})`));

    console.log('\n✅ Rollback complete!\n');

    await sql.end();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
