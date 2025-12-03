import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  try {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });
    const studentId = 6;

    console.log(`\n🔍 Inspecting state for Student ID: ${studentId}`);
    console.log('═'.repeat(60));

    // 1. Get User Info
    const users =
      await sql`SELECT id, name, email, role, is_active FROM users WHERE id = ${studentId}`;
    if (users.length === 0) {
      console.log('❌ User not found!');
      process.exit(0);
    }

    const user = users[0];
    console.log('\n📋 User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);

    // 2. Check Enrollments
    console.log('\n📚 Checking Enrollments:');
    const enrollments = await sql`
            SELECT e.id, e.user_id, e.course_id, e.status, e.progress, c.title as course_title, c.status as course_status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${studentId}
        `;

    if (enrollments.length > 0) {
      console.log(`   Found ${enrollments.length} enrollment(s):`);
      enrollments.forEach((e) => {
        console.log(
          `   - Enrollment #${e.id}: [${e.status.toUpperCase()}] for "${e.course_title}" (Course ID: ${e.course_id}, Course Status: ${e.course_status})`
        );
      });
    } else {
      console.log('   ❌ No enrollments found!');
    }

    // 3. Check Active Enrollments (what API filters for)
    console.log('\n✅ Active Enrollments (status=active):');
    const activeEnrollments = await sql`
            SELECT e.id, e.user_id, e.course_id, e.status, e.progress, c.title as course_title, c.status as course_status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${studentId} AND e.status = 'active'
        `;

    if (activeEnrollments.length > 0) {
      console.log(`   Found ${activeEnrollments.length} active enrollment(s):`);
      activeEnrollments.forEach((e) => {
        console.log(
          `   - Enrollment #${e.id}: "${e.course_title}" (Course ID: ${e.course_id}, Course Status: ${e.course_status})`
        );
      });
    } else {
      console.log('   ❌ No active enrollments found!');
    }

    // 4. Check Published/Active Courses in Enrollments
    console.log('\n📖 Active Enrollments with Published/Active Courses:');
    const publishedEnrollments = await sql`
            SELECT e.id, e.user_id, e.course_id, e.status, e.progress, c.title as course_title, c.status as course_status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${studentId} 
            AND e.status = 'active'
            AND (c.status = 'published' OR c.status = 'active' OR c.status = 'Published' OR c.status = 'Active')
        `;

    if (publishedEnrollments.length > 0) {
      console.log(`   Found ${publishedEnrollments.length} published enrollment(s):`);
      publishedEnrollments.forEach((e) => {
        console.log(
          `   - Enrollment #${e.id}: "${e.course_title}" (Course ID: ${e.course_id}, Course Status: ${e.course_status})`
        );
      });
    } else {
      console.log('   ❌ No published/active course enrollments found!');
    }

    // 5. Check Pending Requests
    console.log('\n📝 Checking Pending Requests:');
    const requests = await sql`
            SELECT ar.id, ar.status, ar.course_id, c.title as course_title
            FROM access_requests ar
            JOIN courses c ON ar.course_id = c.id
            WHERE ar.student_id = ${studentId}
        `;

    if (requests.length > 0) {
      console.log(`   Found ${requests.length} request(s):`);
      requests.forEach((r) => {
        console.log(
          `   - Request #${r.id}: [${r.status.toUpperCase()}] for "${r.course_title}" (Course ID: ${r.course_id})`
        );
      });

      const pendingRequests = requests.filter((r) => r.status === 'pending');
      console.log(`\n   Pending requests count: ${pendingRequests.length}`);
      if (pendingRequests.length > 0) {
        pendingRequests.forEach((r) => {
          console.log(
            `   - Pending Request #${r.id}: "${r.course_title}" (Course ID: ${r.course_id})`
          );
        });
      }
    } else {
      console.log('   (No requests)');
    }

    // 6. Check All Courses
    console.log('\n📚 All Available Courses:');
    const courses = await sql`SELECT id, title, status FROM courses ORDER BY id`;
    console.log(`   Found ${courses.length} total course(s):`);
    courses.forEach((c) => {
      console.log(`   - Course #${c.id}: "${c.title}" [${c.status}]`);
    });

    console.log('\n═'.repeat(60));
    console.log('✅ Inspection complete');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();
