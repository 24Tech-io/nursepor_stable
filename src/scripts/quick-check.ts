import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  try {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    const requests = await sql`
      SELECT ar.id, ar.student_id, ar.course_id, ar.status, ar.reviewed_at
      FROM access_requests ar
      ORDER BY ar.id DESC
      LIMIT 3
    `;

    console.log('\nLatest Requests:');
    for (const r of requests) {
      console.log(
        `\n#${r.id}: Status=${r.status}, Student=${r.student_id}, Course=${r.course_id}, Reviewed=${r.reviewed_at ? 'Yes' : 'No'}`
      );

      const enr =
        await sql`SELECT id FROM enrollments WHERE user_id = ${r.student_id} AND course_id = ${r.course_id}`;
      console.log(`  Enrollment: ${enr.length > 0 ? 'EXISTS' : 'MISSING'}`);

      const prog =
        await sql`SELECT id FROM student_progress WHERE student_id = ${r.student_id} AND course_id = ${r.course_id}`;
      console.log(`  Progress: ${prog.length > 0 ? 'EXISTS' : 'MISSING'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
