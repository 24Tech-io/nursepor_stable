import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Comprehensive Data Validation and Sync Check
 * Identifies and reports all data inconsistencies
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const db = getDatabase();
    const issues: any[] = [];
    const stats: any = {};

    // 1. Check for orphaned studentProgress entries (course or student deleted)
    const allProgress = await db.select().from(studentProgress);
    const allCourses = await db.select().from(courses);
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));

    const courseIds = new Set(allCourses.map((c) => c.id));
    const studentIds = new Set(allStudents.map((s) => s.id));

    const orphanedProgress = allProgress.filter(
      (p) => !courseIds.has(p.courseId) || !studentIds.has(p.studentId)
    );

    if (orphanedProgress.length > 0) {
      issues.push({
        type: 'orphaned_progress',
        severity: 'high',
        count: orphanedProgress.length,
        description: 'Student progress entries for deleted courses or students',
        data: orphanedProgress.map((p) => ({
          id: p.id,
          studentId: p.studentId,
          courseId: p.courseId,
          issue: !courseIds.has(p.courseId) ? 'Course deleted' : 'Student deleted',
        })),
      });
    }

    // 2. Check for orphaned accessRequests
    const allRequests = await db.select().from(accessRequests);
    const orphanedRequests = allRequests.filter(
      (r) => !courseIds.has(r.courseId) || !studentIds.has(r.studentId)
    );

    if (orphanedRequests.length > 0) {
      issues.push({
        type: 'orphaned_requests',
        severity: 'medium',
        count: orphanedRequests.length,
        description: 'Access requests for deleted courses or students',
        data: orphanedRequests.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          courseId: r.courseId,
          status: r.status,
          issue: !courseIds.has(r.courseId) ? 'Course deleted' : 'Student deleted',
        })),
      });
    }

    // 3. Check for courses with pending requests that also have studentProgress (data inconsistency)
    const progressWithRequests = await Promise.all(
      allProgress.map(async (p) => {
        const request = await db
          .select()
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, p.studentId),
              eq(accessRequests.courseId, p.courseId),
              eq(accessRequests.status, 'pending')
            )
          )
          .limit(1);

        if (request.length > 0) {
          return { progress: p, request: request[0] };
        }
        return null;
      })
    );

    const inconsistentEnrollments = progressWithRequests.filter((item) => item !== null);
    if (inconsistentEnrollments.length > 0) {
      issues.push({
        type: 'inconsistent_enrollment',
        severity: 'high',
        count: inconsistentEnrollments.length,
        description: 'Courses with both enrollment (studentProgress) and pending requests',
        data: inconsistentEnrollments.map((item) => ({
          studentId: item!.progress.studentId,
          courseId: item!.progress.courseId,
          issue: 'Has both enrollment and pending request',
        })),
      });
    }

    // 4. Check for orphaned payments
    const allPayments = await db.select().from(payments);
    const orphanedPayments = allPayments.filter(
      (p) => !courseIds.has(p.courseId) || !studentIds.has(p.userId)
    );

    if (orphanedPayments.length > 0) {
      issues.push({
        type: 'orphaned_payments',
        severity: 'medium',
        count: orphanedPayments.length,
        description: 'Payment records for deleted courses or students',
        data: orphanedPayments.map((p) => ({
          id: p.id,
          userId: p.userId,
          courseId: p.courseId,
          issue: !courseIds.has(p.courseId) ? 'Course deleted' : 'Student deleted',
        })),
      });
    }

    // 5. Check for students with enrollments but no valid courses
    const studentsWithInvalidEnrollments = await Promise.all(
      allStudents.map(async (student) => {
        const enrollments = await db
          .select()
          .from(studentProgress)
          .where(eq(studentProgress.studentId, student.id));

        const invalidEnrollments = enrollments.filter((e) => !courseIds.has(e.courseId));

        if (invalidEnrollments.length > 0) {
          return {
            studentId: student.id,
            studentName: student.name,
            invalidCount: invalidEnrollments.length,
          };
        }
        return null;
      })
    );

    const studentsWithIssues = studentsWithInvalidEnrollments.filter((s) => s !== null);
    if (studentsWithIssues.length > 0) {
      issues.push({
        type: 'students_invalid_enrollments',
        severity: 'high',
        count: studentsWithIssues.length,
        description: 'Students with enrollments in deleted courses',
        data: studentsWithIssues,
      });
    }

    // 6. Check for courses with draft status that have enrollments
    const draftCourses = await db.select().from(courses).where(eq(courses.status, 'draft'));

    const draftCoursesWithEnrollments = await Promise.all(
      draftCourses.map(async (course) => {
        const enrollments = await db
          .select()
          .from(studentProgress)
          .where(eq(studentProgress.courseId, course.id))
          .limit(1);

        if (enrollments.length > 0) {
          return {
            courseId: course.id,
            courseTitle: course.title,
            enrollmentCount: enrollments.length,
          };
        }
        return null;
      })
    );

    const draftWithEnrollments = draftCoursesWithEnrollments.filter((c) => c !== null);
    if (draftWithEnrollments.length > 0) {
      issues.push({
        type: 'draft_courses_enrolled',
        severity: 'medium',
        count: draftWithEnrollments.length,
        description: 'Draft courses that have student enrollments',
        data: draftWithEnrollments,
      });
    }

    // Calculate stats
    stats.totalCourses = allCourses.length;
    stats.publishedCourses = allCourses.filter(
      (c) => c.status === 'published' || c.status === 'active'
    ).length;
    stats.draftCourses = draftCourses.length;
    stats.totalStudents = allStudents.length;
    stats.totalEnrollments = allProgress.length;
    stats.validEnrollments = allProgress.filter(
      (p) => courseIds.has(p.courseId) && studentIds.has(p.studentId)
    ).length;
    stats.pendingRequests = allRequests.filter((r) => r.status === 'pending').length;
    stats.totalPayments = allPayments.length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      issues,
      issueCount: issues.length,
      hasIssues: issues.length > 0,
      message:
        issues.length === 0
          ? 'All data is consistent and synced'
          : `Found ${issues.length} type(s) of data inconsistencies`,
    });
  } catch (error: any) {
    console.error('Sync validation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to validate sync',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
