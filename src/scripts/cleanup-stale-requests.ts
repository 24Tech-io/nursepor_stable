/**
 * Cleanup Stale Access Requests
 *
 * Fixes enrollment sync issue by deleting stale approved/rejected/pending requests
 * for students who are already enrolled in courses.
 *
 * Usage: npx tsx src/scripts/cleanup-stale-requests.ts
 */

import postgres from 'postgres';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧹 CLEANUP STALE ACCESS REQUESTS`);
  console.log(`${'='.repeat(80)}\n`);

  const sql = postgres(DATABASE_URL, { ssl: 'require' });

  try {
    // Step 1: Find all requests where enrollment exists
    console.log(`Step 1: Finding stale requests where enrollment exists...\n`);

    const allRequests = await sql`SELECT * FROM access_requests`;
    console.log(`📊 Total requests in database: ${allRequests.length}`);

    const staleRequests: any[] = [];

    for (const request of allRequests) {
      // Check if enrollment exists for this student-course combination
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
        staleRequests.push({
          ...request,
          reason:
            enrollmentCheck.length > 0 ? 'Has enrollment record' : 'Has studentProgress record',
        });
      }
    }

    if (staleRequests.length === 0) {
      console.log(`✅ No stale requests found. Database is clean!\n`);
      console.log(`${'='.repeat(80)}\n`);
      await sql.end();
      return;
    }

    console.log(`⚠️  Found ${staleRequests.length} stale requests:\n`);

    // Group by status
    const byStatus = staleRequests.reduce(
      (acc: any, req: any) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(`   Breakdown by status:`);
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    console.log(`\n${'-'.repeat(80)}\n`);

    // Step 2: Show details of stale requests
    console.log(`Step 2: Stale request details:\n`);

    staleRequests.slice(0, 10).forEach((req: any, i: number) => {
      console.log(`   ${i + 1}. Request ID: ${req.id}`);
      console.log(`      Student ID: ${req.student_id}, Course ID: ${req.course_id}`);
      console.log(`      Status: ${req.status}, Reason: ${req.reason}`);
      console.log(`      Requested At: ${req.requested_at}`);
      console.log(``);
    });

    if (staleRequests.length > 10) {
      console.log(`   ... and ${staleRequests.length - 10} more\n`);
    }

    console.log(`${'-'.repeat(80)}\n`);

    // Step 3: Delete stale requests
    console.log(`Step 3: Deleting stale requests...\n`);

    const requestIds = staleRequests.map((r: any) => r.id);
    let deletedCount = 0;

    for (const requestId of requestIds) {
      const result = await sql`
        DELETE FROM access_requests 
        WHERE id = ${requestId}
        RETURNING id
      `;
      if (result.length > 0) {
        deletedCount++;
      }
    }

    console.log(`\n✅ Total deleted: ${deletedCount} stale requests\n`);

    console.log(`${'-'.repeat(80)}\n`);

    // Step 4: Verify cleanup
    console.log(`Step 4: Verifying cleanup...\n`);

    const remainingRequests = await sql`SELECT * FROM access_requests`;
    console.log(`📊 Remaining requests in database: ${remainingRequests.length}`);

    // Check if any stale requests remain
    let remainingStale = 0;
    for (const request of remainingRequests) {
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
        remainingStale++;
      }
    }

    if (remainingStale === 0) {
      console.log(`✅ Verification passed! No stale requests remain.\n`);
    } else {
      console.error(`⚠️  Warning: ${remainingStale} stale requests still exist.\n`);
      console.error(`   This might indicate an issue with the deletion process.`);
    }

    console.log(`${'='.repeat(80)}\n`);

    // Step 5: Summary and next steps
    console.log(`📋 SUMMARY\n`);
    console.log(`   Stale requests found: ${staleRequests.length}`);
    console.log(`   Stale requests deleted: ${deletedCount}`);
    console.log(`   Remaining stale: ${remainingStale}`);
    console.log(`\n`);

    console.log(`🔍 NEXT STEPS\n`);
    console.log(`   1. Test student login and check "My Courses" page`);
    console.log(`   2. Try requesting a course (should work if not enrolled)`);
    console.log(`   3. Verify admin view matches student view`);
    console.log(`\n${'='.repeat(80)}\n`);

    await sql.end();
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message || error);
    await sql.end();
    process.exit(1);
  }
}

main();
