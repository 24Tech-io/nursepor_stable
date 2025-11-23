import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    console.log('🧹 Cleaning up orphaned enrollments...');

    // Find orphans first
    const orphans = await sql`
      SELECT e.id, e.user_id, e.course_id
      FROM enrollments e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE u.id IS NULL
    `;

    if (orphans.length > 0) {
      console.log(`Found ${orphans.length} orphaned enrollments:`);
      orphans.forEach(o => console.log(` - ID: ${o.id}, UserID: ${o.user_id}, CourseID: ${o.course_id}`));

      // Delete orphans
      await sql`
        DELETE FROM enrollments 
        WHERE id IN ${sql(orphans.map(o => o.id))}
      `;
      console.log('✅ Deleted orphaned enrollments.');
    } else {
      console.log('✅ No orphaned enrollments found.');
    }

    console.log('\n🔄 Syncing missing student_progress records...');

    // Find enrollments without progress
    const missingProgress = await sql`
      SELECT e.user_id, e.course_id
      FROM enrollments e
      LEFT JOIN student_progress sp ON e.user_id = sp.student_id AND e.course_id = sp.course_id
      WHERE sp.id IS NULL
    `;

    if (missingProgress.length > 0) {
      console.log(`Found ${missingProgress.length} enrollments without progress records:`);

      for (const mp of missingProgress) {
        console.log(` - Creating progress for User ${mp.user_id}, Course ${mp.course_id}`);
        await sql`
          INSERT INTO student_progress (student_id, course_id, total_progress, last_accessed)
          VALUES (${mp.user_id}, ${mp.course_id}, 0, NOW())
        `;
      }
      console.log('✅ Created missing student_progress records.');
    } else {
      console.log('✅ All enrollments have corresponding progress records.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

main();
