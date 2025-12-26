/**
 * Delete rogue studentProgress entry for course that was only requested, not enrolled
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6;
  const courseId = 10; // Pharmacology Essentials

  console.log('\n🗑️  DELETING ROGUE STUDENT_PROGRESS ENTRY\n');

  try {
    // Verify current state
    const before = await sql`
      SELECT sp.id, c.title FROM student_progress sp
      JOIN courses c ON sp.course_id = c.id  
      WHERE sp.student_id = ${studentId}
    `;

    console.log('BEFORE: studentProgress table has', before.length, 'records');
    before.forEach((r) => console.log('  -', r.title));
    console.log('');

    // Delete the rogue entry
    const deleted = await sql`
      DELETE FROM student_progress
      WHERE student_id = ${studentId} AND course_id = ${courseId}
      RETURNING id
    `;

    if (deleted.length > 0) {
      console.log(`✅ Deleted studentProgress record #${deleted[0].id}\n`);
    } else {
      console.log('⚠️  No record found to delete\n');
    }

    // Verify after
    const after = await sql`
      SELECT sp.id, c.title FROM student_progress sp
      JOIN courses c ON sp.course_id = c.id
      WHERE sp.student_id = ${studentId}
    `;

    console.log('AFTER: studentProgress table has', after.length, 'records');
    after.forEach((r) => console.log('  -', r.title));
    console.log('');

    // Check both tables match now
    const enrollments = await sql`
      SELECT e.id, c.title FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId}
    `;

    console.log('VERIFICATION:');
    console.log(`  studentProgress: ${after.length} records`);
    console.log(`  enrollments: ${enrollments.length} records`);

    if (after.length === enrollments.length) {
      console.log('  ✅ Tables are NOW in sync!\n');
    } else {
      console.log('  ❌ Tables still NOT in sync\n');
    }

    console.log('✅ Cleanup complete!\n');

    await sql.end();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
