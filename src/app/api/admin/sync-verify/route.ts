import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses, accessRequests, payments } from '@/lib/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

/**
 * Comprehensive Sync Verification Endpoint
 * Verifies that all data is synced correctly between admin and student views
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Get all students with REAL enrollment counts
    const studentsWithRealCounts = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        enrolledCoursesCount:
          sql<number>`COALESCE(COUNT(DISTINCT ${studentProgress.courseId}), 0)`.as(
            'enrolledCoursesCount'
          ),
      })
      .from(users)
      .leftJoin(studentProgress, eq(users.id, studentProgress.studentId))
      .where(eq(users.role, 'student'))
      .groupBy(users.id, users.name, users.email);

    // Get all courses with enrollment counts
    const coursesWithEnrollments = await db
      .select({
        id: courses.id,
        title: courses.title,
        status: courses.status,
        enrollmentCount: sql<number>`COALESCE(COUNT(DISTINCT ${studentProgress.studentId}), 0)`.as(
          'enrollmentCount'
        ),
      })
      .from(courses)
      .leftJoin(studentProgress, eq(courses.id, studentProgress.courseId))
      .groupBy(courses.id, courses.title, courses.status);

    // Get all student progress entries (for verification)
    const allProgressEntries = await db
      .select({
        studentId: studentProgress.studentId,
        courseId: studentProgress.courseId,
      })
      .from(studentProgress);

    // Get pending access requests
    const pendingRequests = await db
      .select({
        count: sql<number>`count(*)`.as('count'),
      })
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'));

    // Verify data consistency
    const verificationResults = {
      students: studentsWithRealCounts.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        enrolledCourses: Number(s.enrolledCoursesCount || 0),
      })),
      courses: coursesWithEnrollments.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        enrolledStudents: Number(c.enrollmentCount || 0),
      })),
      totalProgressEntries: allProgressEntries.length,
      pendingAccessRequests: Number(pendingRequests[0]?.count || 0),
      syncStatus: {
        isSynced: true,
        issues: [] as string[],
      },
    };

    // Check for inconsistencies
    const totalEnrollmentsFromProgress = allProgressEntries.length;
    const totalEnrollmentsFromStudents = studentsWithRealCounts.reduce(
      (sum: number, s: any) => sum + Number(s.enrolledCoursesCount || 0),
      0
    );

    if (totalEnrollmentsFromProgress !== totalEnrollmentsFromStudents) {
      verificationResults.syncStatus.isSynced = false;
      verificationResults.syncStatus.issues.push(
        `Enrollment count mismatch: Progress entries (${totalEnrollmentsFromProgress}) vs Student counts (${totalEnrollmentsFromStudents})`
      );
    }

    // Check for orphaned progress entries (student or course doesn't exist)
    const orphanedProgress = allProgressEntries.filter((p: any) => {
      const studentExists = studentsWithRealCounts.find((s: any) => s.id === p.studentId);
      const courseExists = coursesWithEnrollments.find((c: any) => c.id === p.courseId);
      return !studentExists || !courseExists;
    });

    if (orphanedProgress.length > 0) {
      verificationResults.syncStatus.isSynced = false;
      verificationResults.syncStatus.issues.push(
        `Found ${orphanedProgress.length} orphaned progress entries`
      );
    }

    return NextResponse.json({
      success: true,
      verification: verificationResults,
      summary: {
        totalStudents: studentsWithRealCounts.length,
        totalCourses: coursesWithEnrollments.length,
        totalEnrollments: totalEnrollmentsFromProgress,
        pendingRequests: verificationResults.pendingAccessRequests,
        isSynced: verificationResults.syncStatus.isSynced,
        issuesFound: verificationResults.syncStatus.issues.length,
      },
      message: verificationResults.syncStatus.isSynced
        ? 'All data is synced correctly'
        : `Found ${verificationResults.syncStatus.issues.length} sync issue(s)`,
    });
  } catch (error: any) {
    console.error('Sync verify error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify sync',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

