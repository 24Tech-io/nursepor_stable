import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  try {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    console.log('\n🔍 Checking User ID 6 and ID 7:\n');

    for (const userId of [6, 7]) {
      const users = await sql`SELECT id, name, email, role FROM users WHERE id = ${userId}`;
      if (users.length === 0) {
        console.log(`❌ User ID ${userId} not found`);
        continue;
      }
      const user = users[0];
      console.log(`\n✅ User ID ${userId}:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);

      const requests = await sql`
        SELECT ar.id, ar.status, c.title as course_title 
        FROM access_requests ar
        JOIN courses c ON ar.course_id = c.id
        WHERE ar.student_id = ${userId}
      `;
      console.log(`   Access Requests: ${requests.length}`);
      requests.forEach((r) => {
        console.log(`     - Request #${r.id}: [${r.status}] for "${r.course_title}"`);
      });

      const enrollments = await sql`
        SELECT e.id, e.status, c.title as course_title
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ${userId}
      `;
      console.log(`   Enrollments: ${enrollments.length}`);
      enrollments.forEach((e) => {
        console.log(`     - Enrollment #${e.id}: [${e.status}] for "${e.course_title}"`);
      });

      const progress = await sql`
        SELECT sp.id, c.title as course_title
        FROM student_progress sp
        JOIN courses c ON sp.course_id = c.id
        WHERE sp.student_id = ${userId}
      `;
      console.log(`   Progress Records: ${progress.length}`);
      progress.forEach((p) => {
        console.log(`     - Progress #${p.id}: for "${p.course_title}"`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
