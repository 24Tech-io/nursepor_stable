/**
 * Find the missing course - why is only 1 showing instead of 2?
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });
    const studentId = 6;

    console.log('\n🔍 FINDING MISSING COURSE\n');

    // Get ALL enrollments for this student
    const allEnrollments = await sql`
    SELECT e.id, e.user_id, e.course_id, e.status as enrollment_status, e.progress,
           c.title, c.status as course_status, c.is_requestable, c.is_default_unlocked, c.is_public
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = ${studentId}
    ORDER BY e.id
  `;

    console.log(`Total enrollments in DB: ${allEnrollments.length}\n`);

    allEnrollments.forEach((e, i) => {
        console.log(`${i + 1}. ${e.title}`);
        console.log(`   Enrollment ID: ${e.id}`);
        console.log(`   Course ID: ${e.course_id}`);
        console.log(`   Enrollment Status: "${e.enrollment_status}"`);
        console.log(`   Course Status: "${e.course_status}"`);
        console.log(`   Progress: ${e.progress}%`);
        console.log(`   Flags: isRequestable=${e.is_requestable}, isDefaultUnlocked=${e.is_default_unlocked}, isPublic=${e.is_public}`);
        console.log('');
    });

    // Check which ones pass the published filter
    console.log('Testing published filter:\n');

    for (const e of allEnrollments) {
        const matchesPublished = e.course_status === 'published' || e.course_status === 'active';
        const matchesEnrollmentActive = e.enrollment_status === 'active';
        const bothPass = matchesPublished && matchesEnrollmentActive;

        console.log(`${e.title}:`);
        console.log(`   Course status "${e.course_status}" matches published/active? ${matchesPublished}`);
        console.log(`   Enrollment status "${e.enrollment_status}" = "active"? ${matchesEnrollmentActive}`);
        console.log(`   Should appear in student API? ${bothPass ? '✅ YES' : '❌ NO'}`);
        console.log('');
    }

    // Check for pending requests that might filter them out
    console.log('Checking for pending requests:\n');
    const requests = await sql`
    SELECT ar.id, ar.course_id, ar.status, c.title
    FROM access_requests ar
    JOIN courses c ON ar.course_id = c.id
    WHERE ar.student_id = ${studentId}
  `;

    if (requests.length > 0) {
        console.log(`Found ${requests.length} requests:`);
        requests.forEach(r => {
            console.log(`   - "${r.title}" (Course ID: ${r.course_id}, Status: ${r.status})`);
        });

        const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.course_id);
        if (pendingIds.length > 0) {
            console.log(`\n⚠️  Pending request course IDs: ${pendingIds.join(', ')}`);
            console.log(`   These will be FILTERED OUT from enrolled courses!`);
        }
    } else {
        console.log('   No requests found ✅');
    }

    await sql.end();
}

main();
