/**
 * Quick Check - Verify Cleanup Results
 * 
 * Usage: npx tsx src/scripts/verify-cleanup.ts
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });

    try {
        console.log('\n🔍 VERIFICATION REPORT\n');
        console.log('='.repeat(60));

        // Check 1: Total requests
        const allRequests = await sql`SELECT * FROM access_requests`;
        console.log(`\n📊 Total access requests: ${allRequests.length}`);

        if (allRequests.length > 0) {
            const byStatus = allRequests.reduce((acc: any, r: any) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});
            console.log('   By status:');
            Object.entries(byStatus).forEach(([status, count]) => {
                console.log(`   - ${status}: ${count}`);
            });
        }

        // Check 2: Stale requests (requests where enrollment exists)
        let staleCount = 0;
        const staleDetails: any[] = [];

        for (const request of allRequests) {
            const enrollmentCheck = await sql`
        SELECT id FROM enrollments 
        WHERE user_id = ${request.student_id} 
        AND course_id = ${request.course_id} 
        AND status = 'active'
        LIMIT 1
      `;

            const progressCheck = await sql`
SELECT id FROM student_progress 
        WHERE student_id = ${request.student_id} 
        AND course_id = ${request.course_id}
        LIMIT 1
      `;

            if (enrollmentCheck.length > 0 || progressCheck.length > 0) {
                staleCount++;
                staleDetails.push({
                    id: request.id,
                    studentId: request.student_id,
                    courseId: request.course_id,
                    status: request.status
                });
            }
        }

        console.log(`\n⚠️  Stale requests (with enrollment): ${staleCount}`);

        if (staleCount > 0) {
            console.log('\n   PROBLEM: These requests should have been deleted:');
            staleDetails.forEach((r: any, i: number) => {
                console.log(`   ${i + 1}. Request #${r.id}: Student ${r.studentId}, Course ${r.courseId}, Status: ${r.status}`);
            });
        } else {
            console.log('   ✅ No stale requests found - cleanup successful!');
        }

        // Check 3: Sample student (ID 6)
        const studentId = 6;
        console.log(`\n🔍 Checking Student ID ${studentId}:`);

        const studentEnrollments = await sql`
      SELECT e.*, c.title 
      FROM enrollments e 
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ${studentId} AND e.status = 'active'
    `;

        const studentRequests = await sql`
      SELECT ar.*, c.title 
      FROM access_requests ar 
      JOIN courses c ON ar.course_id = c.id
      WHERE ar.student_id = ${studentId}
    `;

        console.log(`   Enrollments: ${studentEnrollments.length}`);
        if (studentEnrollments.length > 0) {
            studentEnrollments.forEach((e: any) => {
                console.log(`   - Enrolled in: ${e.title} (Course ID: ${e.course_id})`);
            });
        }

        console.log(`   Requests: ${studentRequests.length}`);
        if (studentRequests.length > 0) {
            studentRequests.forEach((r: any) => {
                console.log(`   - Request for: ${r.title} (Status: ${r.status}, Course ID: ${r.course_id})`);
            });

            // Check for conflicts
            const enrolledCourseIds = new Set(studentEnrollments.map((e: any) => e.course_id));
            const requestedCourseIds = studentRequests.map((r: any) => r.course_id);
            const conflicts = requestedCourseIds.filter(id => enrolledCourseIds.has(id));

            if (conflicts.length > 0) {
                console.log(`\n   ❌ CONFLICT: ${conflicts.length} requests exist for enrolled courses!`);
                console.log(`   Course IDs with conflict: ${conflicts.join(', ')}`);
            } else {
                console.log(`\n   ✅ No conflicts - student can request courses correctly`);
            }
        } else {
            console.log(`   ✅ No requests (clean state)`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Verification complete\n');

        await sql.end();
    } catch (error: any) {
        console.error('\n❌ Error:', error.message || error);
        await sql.end();
        process.exit(1);
    }
}

main();
