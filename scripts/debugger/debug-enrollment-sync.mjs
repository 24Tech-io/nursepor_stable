/**
 * Enrollment Synchronization Debugger
 * Deep debugging of enrollment sync issues
 * Uses raw SQL queries to avoid TypeScript import issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🔍 Enrollment Synchronization Deep Debugger');
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

async function debugEnrollmentSync() {
  try {
    console.log('✅ Database connected\n');

    // Get all data
    const [allProgress, allEnrollments, allRequests, allUsers, allCourses] = await Promise.all([
      query(`SELECT student_id as "studentId", course_id as "courseId", total_progress as "totalProgress" FROM student_progress`),
      query(`SELECT user_id as "userId", course_id as "courseId", progress, status FROM enrollments`),
      query(`SELECT id, student_id as "studentId", course_id as "courseId", status FROM access_requests`),
      query(`SELECT id, name, email, role FROM users`),
      query(`SELECT id, title FROM courses`),
    ]);

    console.log(`📊 Data Summary:`);
    console.log(`   - studentProgress records: ${allProgress.length}`);
    console.log(`   - enrollments records: ${allEnrollments.length}`);
    console.log(`   - accessRequests records: ${allRequests.length}`);
    console.log(`   - users: ${allUsers.length}`);
    console.log(`   - courses: ${allCourses.length}\n`);

    // Analyze each student
    console.log('='.repeat(70));
    console.log('🔍 DETAILED ANALYSIS BY STUDENT');
    console.log('='.repeat(70));

    const students = allUsers.filter(u => u.role === 'student');

    for (const student of students) {
      const studentProgressRecords = allProgress.filter(p => p.studentId === student.id);
      const enrollmentRecords = allEnrollments.filter(e => e.userId === student.id);
      const studentRequests = allRequests.filter(r => r.studentId === student.id);

      if (studentProgressRecords.length === 0 && enrollmentRecords.length === 0 && studentRequests.length === 0) {
        continue;
      }

      console.log(`\n👤 Student: ${student.name} (ID: ${student.id}, Email: ${student.email})`);
      console.log(`   Progress records: ${studentProgressRecords.length}`);
      console.log(`   Enrollment records: ${enrollmentRecords.length}`);
      console.log(`   Requests: ${studentRequests.length}`);

      const progressCourseIds = new Set(studentProgressRecords.map(p => p.courseId));
      const enrollmentCourseIds = new Set(enrollmentRecords.map(e => e.courseId));
      const requestCourseIds = new Set(studentRequests.map(r => r.courseId));

      const missingEnrollments = [...progressCourseIds].filter(id => !enrollmentCourseIds.has(id));
      if (missingEnrollments.length > 0) {
        console.log(`   ❌ MISSING ENROLLMENTS for courses: ${missingEnrollments.join(', ')}`);
        missingEnrollments.forEach(courseId => {
          const progress = studentProgressRecords.find(p => p.courseId === courseId);
          const course = allCourses.find(c => c.id === courseId);
          console.log(`      - Course: ${course?.title || `ID ${courseId}`}`);
          console.log(`        Progress: ${progress?.totalProgress}%`);
        });
      }

      const missingProgress = [...enrollmentCourseIds].filter(id => !progressCourseIds.has(id));
      if (missingProgress.length > 0) {
        console.log(`   ❌ MISSING PROGRESS for courses: ${missingProgress.join(', ')}`);
        missingProgress.forEach(courseId => {
          const enrollment = enrollmentRecords.find(e => e.courseId === courseId);
          const course = allCourses.find(c => c.id === courseId);
          console.log(`      - Course: ${course?.title || `ID ${courseId}`}`);
          console.log(`        Enrollment Progress: ${enrollment?.progress}%`);
        });
      }

      const matchingCourses = [...progressCourseIds].filter(id => enrollmentCourseIds.has(id));
      matchingCourses.forEach(courseId => {
        const progress = studentProgressRecords.find(p => p.courseId === courseId);
        const enrollment = enrollmentRecords.find(e => e.courseId === courseId);
        if (progress && enrollment && Math.abs(progress.totalProgress - enrollment.progress) > 1) {
          console.log(`   ⚠️  PROGRESS MISMATCH for course ${courseId}:`);
          const course = allCourses.find(c => c.id === courseId);
          console.log(`      - Course: ${course?.title || `ID ${courseId}`}`);
          console.log(`      - studentProgress: ${progress.totalProgress}%`);
          console.log(`      - enrollments.progress: ${enrollment.progress}%`);
        }
      });

      const approvedRequests = studentRequests.filter(r => r.status === 'approved');
      approvedRequests.forEach(request => {
        const hasProgress = progressCourseIds.has(request.courseId);
        const hasEnrollment = enrollmentCourseIds.has(request.courseId);
        if (!hasProgress || !hasEnrollment) {
          const course = allCourses.find(c => c.id === request.courseId);
          console.log(`   ❌ APPROVED REQUEST WITHOUT ENROLLMENT:`);
          console.log(`      - Request ID: ${request.id}`);
          console.log(`      - Course: ${course?.title || `ID ${request.courseId}`}`);
          console.log(`      - Has studentProgress: ${hasProgress ? '✅' : '❌'}`);
          console.log(`      - Has enrollment: ${hasEnrollment ? '✅' : '❌'}`);
        }
      });
    }

    // Summary statistics
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(70));

    let totalOrphanedProgress = 0;
    let totalOrphanedEnrollments = 0;
    let totalProgressMismatches = 0;
    let totalRequestIssues = 0;

    for (const progress of allProgress) {
      const hasEnrollment = allEnrollments.some(
        e => e.userId === progress.studentId && e.courseId === progress.courseId
      );
      if (!hasEnrollment) totalOrphanedProgress++;
    }

    for (const enrollment of allEnrollments) {
      const hasProgress = allProgress.some(
        p => p.studentId === enrollment.userId && p.courseId === enrollment.courseId
      );
      if (!hasProgress) totalOrphanedEnrollments++;
    }

    for (const progress of allProgress) {
      const enrollment = allEnrollments.find(
        e => e.userId === progress.studentId && e.courseId === progress.courseId
      );
      if (enrollment && Math.abs(progress.totalProgress - enrollment.progress) > 1) {
        totalProgressMismatches++;
      }
    }

    const approvedRequests = allRequests.filter(r => r.status === 'approved');
    for (const request of approvedRequests) {
      const hasProgress = allProgress.some(
        p => p.studentId === request.studentId && p.courseId === request.courseId
      );
      const hasEnrollment = allEnrollments.some(
        e => e.userId === request.studentId && e.courseId === request.courseId
      );
      if (!hasProgress || !hasEnrollment) {
        totalRequestIssues++;
      }
    }

    console.log(`\nTotal Issues:`);
    console.log(`  - Orphaned studentProgress: ${totalOrphanedProgress}`);
    console.log(`  - Orphaned enrollments: ${totalOrphanedEnrollments}`);
    console.log(`  - Progress mismatches: ${totalProgressMismatches}`);
    console.log(`  - Request sync issues: ${totalRequestIssues}`);

    const totalIssues = totalOrphanedProgress + totalOrphanedEnrollments + totalProgressMismatches + totalRequestIssues;
    if (totalIssues === 0) {
      console.log(`\n✅ No synchronization issues found!`);
    } else {
      console.log(`\n⚠️  Total issues: ${totalIssues}`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

debugEnrollmentSync();


