/**
 * SYSTEM-WIDE DATA INTEGRITY AUDIT
 * 
 * Finds ALL enrollment data inconsistencies across ALL students:
 * 1. Rogue studentProgress entries (exists but no enrollment)
 * 2. Orphan enrollments (exists but no studentProgress)
 * 3. Stale approved/rejected requests (student enrolled but request not deleted)
 * 4. Duplicate requests for same course
 * 5. Conflicting states (enrolled + has pending request)
 * 
 * Usage: npx tsx src/scripts/system-wide-audit.ts
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

interface Issue {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    studentId: number;
    studentName: string;
    courseId: number;
    courseTitle: string;
    details: string;
    fix: string;
}

async function main() {
    const sql = postgres(DATABASE_URL, { ssl: 'require' });
    const issues: Issue[] = [];

    console.log('\n' + '='.repeat(100));
    console.log('🔍 SYSTEM-WIDE DATA INTEGRITY AUDIT');
    console.log('='.repeat(100) + '\n');

    try {
        // Get all students
        const students = await sql`SELECT id, name, email FROM users WHERE role = 'student'`;
        console.log(`📊 Auditing ${students.length} students...\n`);

        // Issue Type 1: Rogue studentProgress entries (no corresponding enrollment)
        console.log('🔍 Checking for rogue studentProgress entries...');
        const rogueProgress = await sql`
      SELECT sp.id as progress_id, sp.student_id, sp.course_id, sp.total_progress,
             u.name as student_name, c.title as course_title
      FROM student_progress sp
      JOIN users u ON sp.student_id = u.id
      JOIN courses c ON sp.course_id = c.id
      LEFT JOIN enrollments e ON e.user_id = sp.student_id AND e.course_id = sp.course_id AND e.status = 'active'
      WHERE e.id IS NULL
    `;

        rogueProgress.forEach(r => {
            issues.push({
                type: 'ROGUE_STUDENT_PROGRESS',
                severity: 'critical',
                studentId: r.student_id,
                studentName: r.student_name,
                courseId: r.course_id,
                courseTitle: r.course_title,
                details: `studentProgress entry exists but no active enrollment record (Progress: ${r.total_progress}%)`,
                fix: `DELETE from student_progress WHERE id = ${r.progress_id}`
            });
        });
        console.log(`   Found ${rogueProgress.length} rogue entries\n`);

        // Issue Type 2: Orphan enrollments (no corresponding studentProgress)
        console.log('🔍 Checking for orphan enrollments...');
        const orphanEnrollments = await sql`
      SELECT e.id as enrollment_id, e.user_id, e.course_id, e.progress,
             u.name as student_name, c.title as course_title
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN student_progress sp ON sp.student_id = e.user_id AND sp.course_id = e.course_id
      WHERE e.status = 'active' AND sp.id IS NULL
    `;

        orphanEnrollments.forEach(e => {
            issues.push({
                type: 'ORPHAN_ENROLLMENT',
                severity: 'high',
                studentId: e.user_id,
                studentName: e.student_name,
                courseId: e.course_id,
                courseTitle: e.course_title,
                details: `Enrollment exists but no studentProgress record (Progress: ${e.progress}%)`,
                fix: `CREATE student_progress for user ${e.user_id}, course ${e.course_id}`
            });
        });
        console.log(`   Found ${orphanEnrollments.length} orphan enrollments\n`);

        // Issue Type 3: Stale requests (student enrolled but request still exists)
        console.log('🔍 Checking for stale access requests...');
        const staleRequests = await sql`
      SELECT ar.id as request_id, ar.student_id, ar.course_id, ar.status as request_status,
             u.name as student_name, c.title as course_title,
             CASE WHEN e.id IS NOT NULL THEN true ELSE false END as has_enrollment
      FROM access_requests ar
      JOIN users u ON ar.student_id = u.id
      JOIN courses c ON ar.course_id = c.id
      LEFT JOIN enrollments e ON e.user_id = ar.student_id AND e.course_id = ar.course_id AND e.status = 'active'
      WHERE ar.status IN ('approved', 'rejected') OR (ar.status = 'pending' AND e.id IS NOT NULL)
    `;

        staleRequests.forEach(r => {
            const severity = r.has_enrollment ? 'critical' : (r.request_status === 'approved' ? 'high' : 'medium');
            issues.push({
                type: 'STALE_REQUEST',
                severity,
                studentId: r.student_id,
                studentName: r.student_name,
                courseId: r.course_id,
                courseTitle: r.course_title,
                details: `Request status: ${r.request_status}, has enrollment: ${r.has_enrollment}`,
                fix: `DELETE from access_requests WHERE id = ${r.request_id}`
            });
        });
        console.log(`   Found ${staleRequests.length} stale requests\n`);

        // Issue Type 4: Duplicate requests (multiple requests for same course)
        console.log('🔍 Checking for duplicate requests...');
        const duplicateRequests = await sql`
      SELECT ar.student_id, ar.course_id, u.name as student_name, c.title as course_title,
             COUNT(*) as request_count,
             array_agg(ar.id) as request_ids,
             array_agg(ar.status) as statuses
      FROM access_requests ar
      JOIN users u ON ar.student_id = u.id
      JOIN courses c ON ar.course_id = c.id
      GROUP BY ar.student_id, ar.course_id, u.name, c.title
      HAVING COUNT(*) > 1
    `;

        duplicateRequests.forEach(d => {
            issues.push({
                type: 'DUPLICATE_REQUESTS',
                severity: 'high',
                studentId: d.student_id,
                studentName: d.student_name,
                courseId: d.course_id,
                courseTitle: d.course_title,
                details: `${d.request_count} requests with statuses: ${d.statuses.join(', ')}`,
                fix: `Keep most recent pending, DELETE others`
            });
        });
        console.log(`   Found ${duplicateRequests.length} cases of duplicate requests\n`);

        // Issue Type 5: Data type mismatches between tables
        console.log('🔍 Checking for progress mismatches...');
        const progressMismatches = await sql`
      SELECT sp.student_id, sp.course_id, sp.total_progress as sp_progress,
             e.progress as e_progress,
             u.name as student_name, c.title as course_title,
             ABS(sp.total_progress - e.progress) as diff
      FROM student_progress sp
      JOIN enrollments e ON e.user_id = sp.student_id AND e.course_id = sp.course_id
      JOIN users u ON sp.student_id = u.id
      JOIN courses c ON sp.course_id = c.id
      WHERE ABS(sp.total_progress - e.progress) > 5 AND e.status = 'active'
    `;

        progressMismatches.forEach(p => {
            issues.push({
                type: 'PROGRESS_MISMATCH',
                severity: 'medium',
                studentId: p.student_id,
                studentName: p.student_name,
                courseId: p.course_id,
                courseTitle: p.course_title,
                details: `studentProgress: ${p.sp_progress}%, enrollments: ${p.e_progress}% (diff: ${p.diff}%)`,
                fix: `SYNC progress values (use studentProgress as source of truth)`
            });
        });
        console.log(`   Found ${progressMismatches.length} progress mismatches\n`);

        // SUMMARY
        console.log('\n' + '='.repeat(100));
        console.log('📋 AUDIT SUMMARY');
        console.log('='.repeat(100) + '\n');

        const issuesByType = issues.reduce((acc, issue) => {
            acc[issue.type] = (acc[issue.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const issuesBySeverity = issues.reduce((acc, issue) => {
            acc[issue.severity] = (acc[issue.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('Issues by Type:');
        Object.entries(issuesByType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });

        console.log('\nIssues by Severity:');
        Object.entries(issuesBySeverity).forEach(([severity, count]) => {
            const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
            console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
        });

        console.log(`\n📊 Total Issues Found: ${issues.length}`);
        console.log(`📊 Students Affected: ${new Set(issues.map(i => i.studentId)).size} of ${students.length}`);

        // DETAILED REPORT
        if (issues.length > 0) {
            console.log('\n' + '='.repeat(100));
            console.log('📝 DETAILED ISSUE REPORT');
            console.log('='.repeat(100) + '\n');

            const criticalIssues = issues.filter(i => i.severity === 'critical');
            if (criticalIssues.length > 0) {
                console.log('🔴 CRITICAL ISSUES (Must fix immediately):\n');
                criticalIssues.slice(0, 10).forEach((issue, i) => {
                    console.log(`${i + 1}. [${issue.type}] ${issue.studentName} - ${issue.courseTitle}`);
                    console.log(`   Details: ${issue.details}`);
                    console.log(`   Fix: ${issue.fix}\n`);
                });
                if (criticalIssues.length > 10) {
                    console.log(`   ... and ${criticalIssues.length - 10} more critical issues\n`);
                }
            }

            const highIssues = issues.filter(i => i.severity === 'high');
            if (highIssues.length > 0) {
                console.log('🟠 HIGH PRIORITY ISSUES:\n');
                highIssues.slice(0, 5).forEach((issue, i) => {
                    console.log(`${i + 1}. [${issue.type}] ${issue.studentName} - ${issue.courseTitle}`);
                    console.log(`   Details: ${issue.details}\n`);
                });
                if (highIssues.length > 5) {
                    console.log(`   ... and ${highIssues.length - 5} more high priority issues\n`);
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Audit failed:', error.message);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
