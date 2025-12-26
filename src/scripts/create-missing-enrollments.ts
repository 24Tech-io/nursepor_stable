/**
 * FIX: Create missing enrollment records
 *
 * Creates enrollments table entries for courses that exist in studentProgress
 * but are missing from enrollments table (dual-table sync fix)
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  console.log('\n' + '='.repeat(80));
  console.log('🔧 CREATING MISSING ENROLLMENT RECORDS');
  console.log('='.repeat(80) + '\n');

  try {
    // Find all studentProgress entries that don't have corresponding enrollments
    const missingEnrollments = await sql`
      SELECT DISTINCT sp.student_id, sp.course_id, sp.total_progress, 
             c.title, u.name as student_name
      FROM student_progress sp
      JOIN courses c ON sp.course_id = c.id
      JOIN users u ON sp.student_id = u.id
      LEFT JOIN enrollments e ON e.user_id = sp.student_id AND e.course_id = sp.course_id
      WHERE e.id IS NULL
    `;

    console.log(`Found ${missingEnrollments.length} missing enrollment record(s):\n`);

    if (missingEnrollments.length === 0) {
      console.log('✅ No missing enrollments - all data is in sync!\n');
      console.log('='.repeat(80) + '\n');
      await sql.end();
      return;
    }

    missingEnrollments.forEach((m, i) => {
      console.log(`${i + 1}. Student: ${m.student_name} (ID: ${m.student_id})`);
      console.log(`   Course: ${m.title} (ID: ${m.course_id})`);
      console.log(`   Progress: ${m.total_progress}%\n`);
    });

    console.log('-'.repeat(80) + '\n');
    console.log('Creating missing enrollment records...\n');

    let created = 0;
    for (const missing of missingEnrollments) {
      try {
        const result = await sql`
          INSERT INTO enrollments (user_id, course_id, status, progress, enrolled_at)
          VALUES (${missing.student_id}, ${missing.course_id}, 'active', ${missing.total_progress}, NOW())
          RETURNING id
        `;

        if (result.length > 0) {
          created++;
          console.log(
            `✅ Created enrollment #${result[0].id} for student ${missing.student_name}, course "${missing.title}"`
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Failed to create enrollment for student ${missing.student_id}, course ${missing.course_id}:`,
          error.message
        );
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Successfully created ${created} enrollment record(s)`);
    console.log('='.repeat(80) + '\n');

    // Verify fix
    console.log('Verification - checking student 6:\n');
    const student6Enrollments = await sql`
      SELECT e.course_id, c.title, e.progress
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = 6
      ORDER BY e.id
    `;

    console.log(`Student 6 now has ${student6Enrollments.length} enrollment(s):`);
    student6Enrollments.forEach((e, i) => {
      console.log(`${i + 1}. ${e.title} (Course ID: ${e.course_id}, Progress: ${e.progress}%)`);
    });

    console.log('\n✅ Fix complete!\n');

    await sql.end();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
