/**
 * Diagnostic Script: Enrollment Sync Issue Investigation
 *
 * This script checks the current state of enrollment data for a specific student
 * to diagnose why student and admin portals show different enrollment states.
 *
 * Usage: npx tsx src/scripts/diagnose-enrollment-issue.ts <studentId>
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getDatabase } from '../lib/db/index.js';
import { users, enrollments, studentProgress, accessRequests, courses } from '../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function main() {
  const studentId = parseInt(process.argv[2] || '6'); // Default to student ID 6

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ENROLLMENT DIAGNOSTIC FOR STUDENT ID: ${studentId}`);
  console.log(`${'='.repeat(80)}\n`);

  const db = getDatabase();

  // Check if student exists
  const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);

  if (student.length === 0) {
    console.error(`❌ Student with ID ${studentId} not found`);
    process.exit(1);
  }

  console.log(`✅ Student Found: ${student[0].name} (${student[0].email})`);
  console.log(`   Role: ${student[0].role}`);
  console.log(`\n${'-'.repeat(80)}\n`);

  // 1. Check studentProgress table
  console.log(`📊 TABLE 1: studentProgress (LEGACY)`);
  const progressRecords = await db
    .select({
      id: studentProgress.id,
      courseId: studentProgress.courseId,
      courseTitle: courses.title,
      totalProgress: studentProgress.totalProgress,
      lastAccessed: studentProgress.lastAccessed,
    })
    .from(studentProgress)
    .leftJoin(courses, eq(studentProgress.courseId, courses.id))
    .where(eq(studentProgress.studentId, studentId));

  if (progressRecords.length === 0) {
    console.log(`   ⚠️  No records found in studentProgress`);
  } else {
    console.log(`   ✅ Found ${progressRecords.length} records:`);
    progressRecords.forEach((rec, i) => {
      console.log(
        `   ${i + 1}. Course ID: ${rec.courseId}, Title: ${rec.courseTitle || 'N/A'}, Progress: ${rec.totalProgress}%`
      );
    });
  }

  console.log(`\n${'-'.repeat(80)}\n`);

  // 2. Check enrollments table
  console.log(`📊 TABLE 2: enrollments (NEW SOURCE OF TRUTH)`);
  const enrollmentRecords = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
      courseTitle: courses.title,
      status: enrollments.status,
      progress: enrollments.progress,
      enrolledAt: enrollments.enrolledAt,
      updatedAt: enrollments.updatedAt,
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, studentId));

  if (enrollmentRecords.length === 0) {
    console.log(`   ⚠️  No records found in enrollments`);
  } else {
    console.log(`   ✅ Found ${enrollmentRecords.length} records:`);
    enrollmentRecords.forEach((rec, i) => {
      console.log(
        `   ${i + 1}. Course ID: ${rec.courseId}, Title: ${rec.courseTitle || 'N/A'}, Status: ${rec.status}, Progress: ${rec.progress}%`
      );
    });
  }

  console.log(`\n${'-'.repeat(80)}\n`);

  // 3. Check accessRequests table
  console.log(`📊 TABLE 3: accessRequests`);
  const requestRecords = await db
    .select({
      id: accessRequests.id,
      courseId: accessRequests.courseId,
      courseTitle: courses.title,
      status: accessRequests.status,
      requestedAt: accessRequests.requestedAt,
      reviewedAt: accessRequests.reviewedAt,
    })
    .from(accessRequests)
    .leftJoin(courses, eq(accessRequests.courseId, courses.id))
    .where(eq(accessRequests.studentId, studentId));

  if (requestRecords.length === 0) {
    console.log(`   ✅ No pending/approved/rejected requests`);
  } else {
    console.log(`   ⚠️  Found ${requestRecords.length} requests:`);
    requestRecords.forEach((rec, i) => {
      console.log(
        `   ${i + 1}. Course ID: ${rec.courseId}, Title: ${rec.courseTitle || 'N/A'}, Status: ${rec.status}, Requested: ${rec.requestedAt}`
      );
    });
  }

  console.log(`\n${'-'.repeat(80)}\n`);

  // 4. CRITICAL: Cross-reference to find mismatches
  console.log(`🔍 MISMATCH ANALYSIS`);
  console.log(`\n`);

  // Build sets for comparison
  const progressCourseIds = new Set(progressRecords.map((r) => r.courseId));
  const enrollmentCourseIds = new Set(enrollmentRecords.map((r) => r.courseId));
  const requestCourseIds = new Map(requestRecords.map((r) => [r.courseId, r.status]));

  // Check for courses in studentProgress but NOT in enrollments
  const missingInEnrollments = Array.from(progressCourseIds).filter(
    (id) => !enrollmentCourseIds.has(id)
  );

  if (missingInEnrollments.length > 0) {
    console.log(`   ❌ CRITICAL: Courses in studentProgress but NOT in enrollments:`);
    missingInEnrollments.forEach((courseId) => {
      const rec = progressRecords.find((r) => r.courseId === courseId);
      console.log(`      - Course ID: ${courseId} (${rec?.courseTitle || 'N/A'})`);
    });
    console.log(`      🔧 FIX: These need enrollment records created`);
  } else {
    console.log(`   ✅ All studentProgress records have matching enrollments`);
  }

  console.log(`\n`);

  // Check for courses in enrollments but NOT in studentProgress
  const missingInProgress = Array.from(enrollmentCourseIds).filter(
    (id) => !progressCourseIds.has(id)
  );

  if (missingInProgress.length > 0) {
    console.log(`   ⚠️  Courses in enrollments but NOT in studentProgress:`);
    missingInProgress.forEach((courseId) => {
      const rec = enrollmentRecords.find((r) => r.courseId === courseId);
      console.log(`      - Course ID: ${courseId} (${rec?.courseTitle || 'N/A'})`);
    });
    console.log(`      📝 NOTE: This is OK if using new enrollment system only`);
  } else {
    console.log(`   ✅ All enrollment records have matching studentProgress`);
  }

  console.log(`\n`);

  // Check for courses with approved/pending requests that are also enrolled
  const enrolledWithRequests: number[] = [];
  requestRecords.forEach((req) => {
    if (progressCourseIds.has(req.courseId) || enrollmentCourseIds.has(req.courseId)) {
      enrolledWithRequests.push(req.courseId);
    }
  });

  if (enrolledWithRequests.length > 0) {
    console.log(`   ❌ CRITICAL: Courses with enrollment AND request (should be deleted):`);
    enrolledWithRequests.forEach((courseId) => {
      const req = requestRecords.find((r) => r.courseId === courseId);
      const hasProgress = progressCourseIds.has(courseId);
      const hasEnrollment = enrollmentCourseIds.has(courseId);
      console.log(`      - Course ID: ${courseId} (${req?.courseTitle || 'N/A'})`);
      console.log(`        Request Status: ${req?.status}`);
      console.log(`        Has studentProgress: ${hasProgress ? '✅' : '❌'}`);
      console.log(`        Has enrollments: ${hasEnrollment ? '✅' : '❌'}`);
    });
    console.log(`      🔧 FIX: Delete these request records (student is already enrolled)`);
  } else {
    console.log(`   ✅ No requests for already-enrolled courses`);
  }

  console.log(`\n${'='.repeat(80)}\n`);

  // 5. Summary
  console.log(`📋 SUMMARY`);
  console.log(`\n`);
  console.log(`   studentProgress records: ${progressRecords.length}`);
  console.log(`   enrollments records: ${enrollmentRecords.length}`);
  console.log(`   accessRequests (all statuses): ${requestRecords.length}`);
  console.log(`   - Pending: ${requestRecords.filter((r) => r.status === 'pending').length}`);
  console.log(`   - Approved: ${requestRecords.filter((r) => r.status === 'approved').length}`);
  console.log(`   - Rejected: ${requestRecords.filter((r) => r.status === 'rejected').length}`);
  console.log(`\n`);

  // Diagnosis
  console.log(`🔧 DIAGNOSIS`);
  console.log(`\n`);

  if (missingInEnrollments.length > 0) {
    console.log(`   ❌ DATA INCONSISTENCY DETECTED`);
    console.log(`      Problem: Dual-table sync is broken`);
    console.log(`      Impact: Admin sees enrollments, student doesn't (or vice versa)`);
    console.log(
      `      Solution: Run sync-missing-enrollments.ts or manually create missing records`
    );
  } else if (enrolledWithRequests.length > 0) {
    console.log(`   ❌ STALE REQUEST DATA DETECTED`);
    console.log(`      Problem: Approved/pending requests not deleted after enrollment`);
    console.log(`      Impact: Student can't request course (shows "already enrolled")`);
    console.log(`      Solution: Delete request records for enrolled courses`);
  } else if (progressRecords.length === 0 && enrollmentRecords.length === 0) {
    console.log(`   ⚠️  NO ENROLLMENTS FOUND`);
    console.log(`      Student has no enrolled courses in either table`);
    console.log(`      This may be intentional if student hasn't enrolled yet`);
  } else {
    console.log(`   ✅ DATA LOOKS CONSISTENT`);
    console.log(`      Both tables are in sync`);
    console.log(`      If UI still shows issues, check frontend logic`);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

main().catch(console.error);
