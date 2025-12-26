/**
 * Database Synchronization Debugger
 * Checks for data inconsistencies between studentProgress and enrollments tables
 * Uses raw SQL queries to avoid TypeScript import issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🔍 Database Synchronization Debugger');
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
} catch (e) {
  console.log('⚠️  No .env.local file found');
}

if (!envVars.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: envVars.DATABASE_URL });

const issues = {
  orphanedProgress: [],
  orphanedEnrollments: [],
  progressMismatch: [],
  requestSyncIssues: [],
};

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function debugDatabaseSync() {
  try {
    console.log('✅ Database connected\n');

    // 1. Find orphaned studentProgress (no matching enrollment)
    console.log('1️⃣ Checking for orphaned studentProgress records...');
    const allProgress = await query(`
      SELECT student_id as "studentId", course_id as "courseId", total_progress as "totalProgress"
      FROM student_progress
    `);
    const allEnrollments = await query(`
      SELECT user_id as "userId", course_id as "courseId", progress, status
      FROM enrollments
    `);

    for (const progress of allProgress) {
      const matchingEnrollment = allEnrollments.find(
        e => e.userId === progress.studentId && e.courseId === progress.courseId
      );

      if (!matchingEnrollment) {
        issues.orphanedProgress.push({
          studentId: progress.studentId,
          courseId: progress.courseId,
          progress: progress.totalProgress,
        });
      }
    }

    console.log(`   Found ${issues.orphanedProgress.length} orphaned studentProgress records`);

    // 2. Find orphaned enrollments (no matching studentProgress)
    console.log('\n2️⃣ Checking for orphaned enrollments records...');
    for (const enrollment of allEnrollments) {
      const matchingProgress = allProgress.find(
        p => p.studentId === enrollment.userId && p.courseId === enrollment.courseId
      );

      if (!matchingProgress) {
        issues.orphanedEnrollments.push({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          progress: enrollment.progress,
          status: enrollment.status,
        });
      }
    }

    console.log(`   Found ${issues.orphanedEnrollments.length} orphaned enrollments records`);

    // 3. Find progress mismatches
    console.log('\n3️⃣ Checking for progress mismatches...');
    for (const progress of allProgress) {
      const enrollment = allEnrollments.find(
        e => e.userId === progress.studentId && e.courseId === progress.courseId
      );

      if (enrollment && Math.abs(progress.totalProgress - enrollment.progress) > 1) {
        issues.progressMismatch.push({
          studentId: progress.studentId,
          courseId: progress.courseId,
          studentProgress: progress.totalProgress,
          enrollmentProgress: enrollment.progress,
          difference: Math.abs(progress.totalProgress - enrollment.progress),
        });
      }
    }

    console.log(`   Found ${issues.progressMismatch.length} progress mismatches`);

    // 4. Check approved requests without enrollment
    console.log('\n4️⃣ Checking approved requests without enrollment...');
    const approvedRequests = await query(`
      SELECT id, student_id as "studentId", course_id as "courseId"
      FROM access_requests
      WHERE status = 'approved'
    `);

    for (const request of approvedRequests) {
      const hasProgress = allProgress.some(
        p => p.studentId === request.studentId && p.courseId === request.courseId
      );
      const hasEnrollment = allEnrollments.some(
        e => e.userId === request.studentId && e.courseId === request.courseId
      );

      if (!hasProgress || !hasEnrollment) {
        issues.requestSyncIssues.push({
          requestId: request.id,
          studentId: request.studentId,
          courseId: request.courseId,
          hasProgress,
          hasEnrollment,
        });
      }
    }

    console.log(`   Found ${issues.requestSyncIssues.length} approved requests without enrollment`);

    // 5. Get user and course names for better reporting
    console.log('\n5️⃣ Enriching data with user and course names...');
    const allUsers = await query(`
      SELECT id, name, email
      FROM users
    `);
    const allCourses = await query(`
      SELECT id, title
      FROM courses
    `);

    const getUserName = (id) => {
      const user = allUsers.find(u => u.id === id);
      return user ? `${user.name} (${user.email})` : `User ID ${id}`;
    };

    const getCourseName = (id) => {
      const course = allCourses.find(c => c.id === id);
      return course ? course.title : `Course ID ${id}`;
    };

    // Print detailed report
    console.log('\n' + '='.repeat(70));
    console.log('📊 SYNCHRONIZATION ISSUES REPORT');
    console.log('='.repeat(70));

    if (issues.orphanedProgress.length > 0) {
      console.log('\n❌ ORPHANED STUDENTPROGRESS RECORDS:');
      issues.orphanedProgress.forEach(issue => {
        console.log(`   - Student: ${getUserName(issue.studentId)}`);
        console.log(`     Course: ${getCourseName(issue.courseId)}`);
        console.log(`     Progress: ${issue.progress}%`);
        console.log(`     Issue: Has studentProgress but NO enrollment record`);
        console.log('');
      });
    }

    if (issues.orphanedEnrollments.length > 0) {
      console.log('\n❌ ORPHANED ENROLLMENTS RECORDS:');
      issues.orphanedEnrollments.forEach(issue => {
        console.log(`   - User: ${getUserName(issue.userId)}`);
        console.log(`     Course: ${getCourseName(issue.courseId)}`);
        console.log(`     Progress: ${issue.progress}%`);
        console.log(`     Status: ${issue.status}`);
        console.log(`     Issue: Has enrollment but NO studentProgress record`);
        console.log('');
      });
    }

    if (issues.progressMismatch.length > 0) {
      console.log('\n⚠️  PROGRESS MISMATCHES:');
      issues.progressMismatch.forEach(issue => {
        console.log(`   - Student: ${getUserName(issue.studentId)}`);
        console.log(`     Course: ${getCourseName(issue.courseId)}`);
        console.log(`     studentProgress: ${issue.studentProgress}%`);
        console.log(`     enrollments.progress: ${issue.enrollmentProgress}%`);
        console.log(`     Difference: ${issue.difference}%`);
        console.log('');
      });
    }

    if (issues.requestSyncIssues.length > 0) {
      console.log('\n❌ APPROVED REQUESTS WITHOUT ENROLLMENT:');
      issues.requestSyncIssues.forEach(issue => {
        console.log(`   - Request ID: ${issue.requestId}`);
        console.log(`     Student: ${getUserName(issue.studentId)}`);
        console.log(`     Course: ${getCourseName(issue.courseId)}`);
        console.log(`     Has studentProgress: ${issue.hasProgress ? '✅' : '❌'}`);
        console.log(`     Has enrollment: ${issue.hasEnrollment ? '✅' : '❌'}`);
        console.log('');
      });
    }

    // Summary
    const totalIssues = 
      issues.orphanedProgress.length +
      issues.orphanedEnrollments.length +
      issues.progressMismatch.length +
      issues.requestSyncIssues.length;

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Issues Found: ${totalIssues}`);
    console.log(`  - Orphaned studentProgress: ${issues.orphanedProgress.length}`);
    console.log(`  - Orphaned enrollments: ${issues.orphanedEnrollments.length}`);
    console.log(`  - Progress mismatches: ${issues.progressMismatch.length}`);
    console.log(`  - Request sync issues: ${issues.requestSyncIssues.length}`);

    if (totalIssues === 0) {
      console.log('\n✅ No synchronization issues found!');
    } else {
      console.log('\n⚠️  Issues found. Review details above.');
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues,
        orphanedProgress: issues.orphanedProgress.length,
        orphanedEnrollments: issues.orphanedEnrollments.length,
        progressMismatch: issues.progressMismatch.length,
        requestSyncIssues: issues.requestSyncIssues.length,
      },
      issues,
    };

    const fs = await import('fs');
    const reportPath = join(projectRoot, 'debug-sync-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

debugDatabaseSync();


