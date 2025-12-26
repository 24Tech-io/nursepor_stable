/**
 * Deep Diagnostic - Compare Database vs API Responses
 *
 * This checks EXACTLY what's in the database vs what the APIs return
 * to find why student sees no courses but admin sees 2 courses
 *
 * Usage: npx tsx src/scripts/deep-diagnostic.ts
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  const studentId = 6; // Adhithiyan Maliackal from screenshot

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DEEP DIAGNOSTIC FOR STUDENT ID:', studentId);
    console.log('='.repeat(80) + '\n');

    // 1. Get student info
    const [student] = await sql`SELECT * FROM users WHERE id = ${studentId}`;
    console.log('📋 STUDENT INFO:');
    console.log(`   Name: ${student.name}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   Active: ${student.is_active}\n`);

    // 2. Check enrollments table (NEW source of truth)
    console.log('📊 TABLE: enrollments (NEW SOURCE OF TRUTH)');
    const enrollmentsRaw = await sql`
      SELECT e.*, c.title, c.status as course_status 
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId}
    `;
    console.log(`   Total entries: ${enrollmentsRaw.length}`);
    if (enrollmentsRaw.length > 0) {
      enrollmentsRaw.forEach((e) => {
        console.log(
          `   - ID:${e.id}, Course:"${e.title}", EnrollStatus:${e.status}, CourseStatus:${e.course_status}, Progress:${e.progress}%`
        );
      });
    }
    console.log('');

    // 3. Check enrollments with status='active'
    console.log("📊 FILTERED: enrollments WHERE status='active'");
    const activeEnrollments = await sql`
      SELECT e.*, c.title, c.status as course_status 
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId} AND e.status = 'active'
    `;
    console.log(`   Count: ${activeEnrollments.length}`);
    if (activeEnrollments.length > 0) {
      activeEnrollments.forEach((e) => {
        console.log(`   - Course:"${e.title}", CourseStatus:${e.course_status}`);
      });
    }
    console.log('');

    // 4. Check courses table - what statuses exist?
    console.log('📚 COURSE STATUSES IN DATABASE:');
    const courseStatuses = await sql`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM courses 
      GROUP BY status
    `;
    console.log(`   Unique statuses found:`);
    courseStatuses.forEach((s) => {
      console.log(`   - "${s.status}": ${s.count} courses`);
    });
    console.log('');

    // 5. Check enrolled courses with published filter (case variations)
    console.log('📖 ENROLLED COURSES (with published filter - case sensitive):');
    const publishedVariants = ['published', 'Published', 'active', 'Active'];

    for (const variant of publishedVariants) {
      const count = await sql`
        SELECT COUNT(*) as count
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ${studentId} 
        AND e.status = 'active'
        AND c.status = ${variant}
      `;
      console.log(`   c.status = '${variant}': ${count[0].count} courses`);
    }
    console.log('');

    // 6. Check studentProgress table (LEGACY)
    console.log('📊 TABLE: student_progress (LEGACY)');
    const progressRaw = await sql`
      SELECT sp.*, c.title, c.status as course_status 
      FROM student_progress sp
      LEFT JOIN courses c ON sp.course_id = c.id
      WHERE sp.student_id = ${studentId}
    `;
    console.log(`   Total entries: ${progressRaw.length}`);
    if (progressRaw.length > 0) {
      progressRaw.forEach((p) => {
        console.log(
          `   - Course:"${p.title}", CourseStatus:${p.course_status}, Progress:${p.total_progress}%`
        );
      });
    }
    console.log('');

    // 7. Check access requests
    console.log('📝 TABLE: access_requests');
    const requests = await sql`
      SELECT ar.*, c.title 
      FROM access_requests ar
      LEFT JOIN courses c ON ar.course_id = c.id
      WHERE ar.student_id = ${studentId}
    `;
    console.log(`   Total requests: ${requests.length}`);
    if (requests.length > 0) {
      requests.forEach((r) => {
        console.log(`   - ID:${r.id}, Course:"${r.title}", Status:${r.status}`);
      });
    } else {
      console.log(`   ✅ No requests (good - cleanup worked)`);
    }
    console.log('');

    // 8. Simulate student API query
    console.log('🔍 SIMULATING /api/student/enrolled-courses QUERY:');
    console.log('   Query 1: studentProgress with published filter');
    const apiQuery1 = await sql`
      SELECT sp.course_id, sp.total_progress, c.title, c.status
      FROM student_progress sp
      INNER JOIN courses c ON sp.course_id = c.id
      WHERE sp.student_id = ${studentId}
      AND (c.status = 'published' OR c.status = 'active' OR c.status = 'Published' OR c.status = 'Active')
    `;
    console.log(`   Result: ${apiQuery1.length} courses`);
    apiQuery1.forEach((c) => {
      console.log(`   - "${c.title}" (status: ${c.status})`);
    });
    console.log('');

    console.log('   Query 2: enrollments with published filter');
    const apiQuery2 = await sql`
      SELECT e.course_id, e.progress, c.title, c.status
      FROM enrollments e
      INNER JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId}
      AND e.status = 'active'
      AND (c.status = 'published' OR c.status = 'active' OR c.status = 'Published' OR c.status = 'Active')
    `;
    console.log(`   Result: ${apiQuery2.length} courses`);
    apiQuery2.forEach((c) => {
      console.log(`   - "${c.title}" (status: ${c.status})`);
    });
    console.log('');

    // 9. Check if pending requests are filtering out courses
    console.log('🔍 CHECKING: Are pending requests filtering out courses?');
    const pendingRequests = await sql`
      SELECT course_id FROM access_requests 
      WHERE student_id = ${studentId} AND status = 'pending'
    `;
    console.log(`   Pending requests: ${pendingRequests.length}`);
    if (pendingRequests.length > 0) {
      const pendingCourseIds = pendingRequests.map((r) => r.course_id);
      console.log(`   ⚠️  These course IDs have pending requests: ${pendingCourseIds.join(', ')}`);
      console.log(`   ⚠️  API may be filtering these out!`);
    }
    console.log('');

    // 10. THE SMOKING GUN - exact comparison
    console.log('🎯 THE SMOKING GUN:');
    console.log('   Admin sees (from enrollments table):');
    enrollmentsRaw.forEach((e) => {
      console.log(`   ✅ ${e.title}`);
    });
    console.log('');
    console.log('   Student API returns (merged + filtered):');
    if (apiQuery1.length === 0 && apiQuery2.length === 0) {
      console.log(`   ❌ NOTHING (this is the bug!)`);
    } else {
      const merged = [...apiQuery1, ...apiQuery2];
      const uniqueCourses = [...new Set(merged.map((c) => c.title))];
      uniqueCourses.forEach((title) => {
        console.log(`   ✅ ${title}`);
      });
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ Diagnostic complete\n');

    await sql.end();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
