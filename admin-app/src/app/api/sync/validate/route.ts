import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, users, payments } from '@/lib/db/schema';
import { eq, and, or, sql, inArray } from 'drizzle-orm';

/**
 * Comprehensive Data Validation and Sync Check (Admin App)
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
    const issues: any[] = [];
    const stats: any = {};

    // Same validation logic as student app
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
      });
    }

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
      });
    }

    stats.totalCourses = allCourses.length;
    stats.publishedCourses = allCourses.filter(
      (c) => c.status === 'published' || c.status === 'active'
    ).length;
    stats.totalStudents = allStudents.length;
    stats.totalEnrollments = allProgress.length;
    stats.validEnrollments = allProgress.filter(
      (p) => courseIds.has(p.courseId) && studentIds.has(p.studentId)
    ).length;
    stats.pendingRequests = allRequests.filter((r) => r.status === 'pending').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      issues,
      issueCount: issues.length,
      hasIssues: issues.length > 0,
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




