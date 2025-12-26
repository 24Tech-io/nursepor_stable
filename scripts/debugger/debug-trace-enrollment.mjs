/**
 * Enrollment Trace Debugger
 * Traces enrollment operations to find where sync breaks
 * Uses raw SQL queries
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🔍 Enrollment Trace Debugger');
console.log('='.repeat(70));

// Load environment
let envVars = {};
try {
  const envFile = readFileSync(join(projectRoot, '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {}

if (!envVars.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: envVars.DATABASE_URL });

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function traceEnrollment(studentId, courseId) {
  console.log(`\n📋 Tracing enrollment for:`);
  console.log(`   Student ID: ${studentId}`);
  console.log(`   Course ID: ${courseId}\n`);

  const [progressRecord] = await query(`
    SELECT student_id as "studentId", course_id as "courseId", total_progress as "totalProgress", last_accessed as "lastAccessed"
    FROM student_progress
    WHERE student_id = $1 AND course_id = $2
  `, [studentId, courseId]);

  const [enrollmentRecord] = await query(`
    SELECT user_id as "userId", course_id as "courseId", progress, status, enrolled_at as "enrolledAt"
    FROM enrollments
    WHERE user_id = $1 AND course_id = $2
  `, [studentId, courseId]);

  const [requestRecord] = await query(`
    SELECT id, student_id as "studentId", course_id as "courseId", status, requested_at as "requestedAt", reviewed_at as "reviewedAt"
    FROM access_requests
    WHERE student_id = $1 AND course_id = $2
  `, [studentId, courseId]);

  console.log('📊 Current State:');
  console.log(`   studentProgress: ${progressRecord ? '✅ EXISTS' : '❌ MISSING'}`);
  if (progressRecord) {
    console.log(`     - Progress: ${progressRecord.totalProgress}%`);
    console.log(`     - Last Accessed: ${progressRecord.lastAccessed}`);
  }

  console.log(`   enrollments: ${enrollmentRecord ? '✅ EXISTS' : '❌ MISSING'}`);
  if (enrollmentRecord) {
    console.log(`     - Progress: ${enrollmentRecord.progress}%`);
    console.log(`     - Status: ${enrollmentRecord.status}`);
    console.log(`     - Enrolled At: ${enrollmentRecord.enrolledAt}`);
  }

  console.log(`   accessRequests: ${requestRecord ? '✅ EXISTS' : '❌ MISSING'}`);
  if (requestRecord) {
    console.log(`     - Status: ${requestRecord.status}`);
    console.log(`     - Requested At: ${requestRecord.requestedAt}`);
    console.log(`     - Reviewed At: ${requestRecord.reviewedAt || 'Not reviewed'}`);
  }

  console.log('\n🔍 Sync Analysis:');
  
  if (progressRecord && !enrollmentRecord) {
    console.log('   ❌ SYNC ISSUE: Has studentProgress but NO enrollment');
    console.log('   🔧 Fix: Create enrollment record to match studentProgress');
  } else if (!progressRecord && enrollmentRecord) {
    console.log('   ❌ SYNC ISSUE: Has enrollment but NO studentProgress');
    console.log('   🔧 Fix: Create studentProgress record to match enrollment');
  } else if (progressRecord && enrollmentRecord) {
    if (Math.abs(progressRecord.totalProgress - enrollmentRecord.progress) > 1) {
      console.log('   ⚠️  SYNC ISSUE: Progress mismatch');
      console.log(`      studentProgress: ${progressRecord.totalProgress}%`);
      console.log(`      enrollments: ${enrollmentRecord.progress}%`);
      console.log('   🔧 Fix: Sync progress values');
    } else {
      console.log('   ✅ SYNC OK: Both records exist and progress matches');
    }
  } else {
    console.log('   ℹ️  No enrollment records found');
  }

  if (requestRecord && requestRecord.status === 'approved') {
    if (!progressRecord || !enrollmentRecord) {
      console.log('   ❌ SYNC ISSUE: Approved request but enrollment not created');
      console.log('   🔧 Fix: Run syncEnrollmentAfterApproval');
    }
  }

  await pool.end();
}

async function traceAllEnrollments() {
  const allProgress = await query(`
    SELECT student_id as "studentId", course_id as "courseId", total_progress as "totalProgress"
    FROM student_progress
  `);
  const allEnrollments = await query(`
    SELECT user_id as "userId", course_id as "courseId", progress
    FROM enrollments
  `);

  console.log(`\n📊 Analyzing ${allProgress.length} studentProgress records...\n`);

  const issues = {
    missingEnrollments: [],
    missingProgress: [],
    progressMismatches: [],
  };

  for (const progress of allProgress) {
    const enrollment = allEnrollments.find(
      e => e.userId === progress.studentId && e.courseId === progress.courseId
    );

    if (!enrollment) {
      issues.missingEnrollments.push({
        studentId: progress.studentId,
        courseId: progress.courseId,
        progress: progress.totalProgress,
      });
    } else if (Math.abs(progress.totalProgress - enrollment.progress) > 1) {
      issues.progressMismatches.push({
        studentId: progress.studentId,
        courseId: progress.courseId,
        studentProgress: progress.totalProgress,
        enrollmentProgress: enrollment.progress,
      });
    }
  }

  for (const enrollment of allEnrollments) {
    const progress = allProgress.find(
      p => p.studentId === enrollment.userId && p.courseId === enrollment.courseId
    );

    if (!progress) {
      issues.missingProgress.push({
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        progress: enrollment.progress,
      });
    }
  }

  console.log('📋 Summary:');
  console.log(`   Missing enrollments: ${issues.missingEnrollments.length}`);
  console.log(`   Missing progress: ${issues.missingProgress.length}`);
  console.log(`   Progress mismatches: ${issues.progressMismatches.length}`);

  if (issues.missingEnrollments.length > 0) {
    console.log('\n❌ Missing Enrollments (first 10):');
    issues.missingEnrollments.slice(0, 10).forEach(issue => {
      console.log(`   Student ${issue.studentId}, Course ${issue.courseId}, Progress ${issue.progress}%`);
    });
  }

  if (issues.missingProgress.length > 0) {
    console.log('\n❌ Missing Progress (first 10):');
    issues.missingProgress.slice(0, 10).forEach(issue => {
      console.log(`   User ${issue.userId}, Course ${issue.courseId}, Progress ${issue.progress}%`);
    });
  }

  if (issues.progressMismatches.length > 0) {
    console.log('\n⚠️  Progress Mismatches (first 10):');
    issues.progressMismatches.slice(0, 10).forEach(issue => {
      console.log(`   Student ${issue.studentId}, Course ${issue.courseId}`);
      console.log(`     studentProgress: ${issue.studentProgress}%`);
      console.log(`     enrollments: ${issue.enrollmentProgress}%`);
    });
  }

  await pool.end();
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 2) {
    const studentId = parseInt(args[0]);
    const courseId = parseInt(args[1]);
    await traceEnrollment(studentId, courseId);
  } else {
    await traceAllEnrollments();
  }
}

main().catch(console.error);


