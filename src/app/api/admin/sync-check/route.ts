import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, accessRequests } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

    // 1. Find enrollments in studentProgress but NOT in enrollments
    const progressOnly = await db
      .select({
        studentId: studentProgress.studentId,
        courseId: studentProgress.courseId,
      })
      .from(studentProgress)
      .leftJoin(
        enrollments,
        and(
          eq(studentProgress.studentId, enrollments.userId),
          eq(studentProgress.courseId, enrollments.courseId)
        )
      )
      .where(sql`${enrollments.id} IS NULL`);

    // 2. Find enrollments in enrollments but NOT in studentProgress
    const enrollmentsOnly = await db
      .select({
        userId: enrollments.userId,
        courseId: enrollments.courseId,
      })
      .from(enrollments)
      .leftJoin(
        studentProgress,
        and(
          eq(enrollments.userId, studentProgress.studentId),
          eq(enrollments.courseId, studentProgress.courseId)
        )
      )
      .where(and(eq(enrollments.status, 'active'), sql`${studentProgress.id} IS NULL`));

    // 3. Find approved requests without enrollments
    const approvedNoEnroll = await db
      .select({
        requestId: accessRequests.id,
        studentId: accessRequests.studentId,
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .leftJoin(
        enrollments,
        and(
          eq(accessRequests.studentId, enrollments.userId),
          eq(accessRequests.courseId, enrollments.courseId)
        )
      )
      .where(and(eq(accessRequests.status, 'approved'), sql`${enrollments.id} IS NULL`));

    // 4. Find pending requests for already-enrolled courses
    const pendingEnrolled = await db
      .select({
        requestId: accessRequests.id,
        studentId: accessRequests.studentId,
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .innerJoin(
        enrollments,
        and(
          eq(accessRequests.studentId, enrollments.userId),
          eq(accessRequests.courseId, enrollments.courseId),
          eq(enrollments.status, 'active')
        )
      )
      .where(eq(accessRequests.status, 'pending'));

    const inconsistencies = {
      progressOnly,
      enrollmentsOnly,
      approvedNoEnroll,
      pendingEnrolled,
    };

    const totalCount =
      progressOnly.length +
      enrollmentsOnly.length +
      approvedNoEnroll.length +
      pendingEnrolled.length;

    return NextResponse.json({
      inconsistencies,
      count: totalCount,
      summary: {
        progressOnlyCount: progressOnly.length,
        enrollmentsOnlyCount: enrollmentsOnly.length,
        approvedNoEnrollCount: approvedNoEnroll.length,
        pendingEnrolledCount: pendingEnrolled.length,
      },
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
