import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentProgress, courses, enrollments } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Get enrollment stats per course with proper SQL - query BOTH tables
    const enrollmentStats = await db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        enrollmentCount: sql<number>`cast(count(distinct COALESCE(${enrollments.userId}, ${studentProgress.studentId})) as int)`,
        avgProgress: sql<number>`coalesce(avg(cast(COALESCE(${enrollments.progress}, ${studentProgress.totalProgress}) as float)), 0)`,
      })
      .from(courses)
      .leftJoin(studentProgress, eq(courses.id, studentProgress.courseId))
      .leftJoin(enrollments, and(
        eq(courses.id, enrollments.courseId),
        eq(enrollments.status, 'active')
      ))
      .where(eq(courses.status, 'published'))
      .groupBy(courses.id, courses.title)
      .orderBy(desc(sql`count(distinct COALESCE(${enrollments.userId}, ${studentProgress.studentId}))`));

    return NextResponse.json({
      enrollmentStats,
      totalCourses: enrollmentStats.length
    });
  } catch (error) {
    console.error('Get enrollment report error:', error);
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
