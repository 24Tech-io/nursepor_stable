import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logStudentActivity } from '@/lib/student-activity-log';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    let decoded: any = null;
    try {
      decoded = await verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(params.courseId);

    if (isNaN(courseIdNum)) {
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    // Get course
    const courseData = await db.select().from(courses).where(eq(courses.id, courseIdNum)).limit(1);

    if (courseData.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Check enrollment using enrollments table
    const enrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, decoded.id),
          eq(enrollments.courseId, courseIdNum),
          eq(enrollments.status, 'active')
        )
      )
      .limit(1);

    // Log course view activity
    try {
      await logStudentActivity({
        studentId: decoded.id,
        activityType: 'course_view',
        title: `Viewed Course: ${courseData[0].title}`,
        metadata: {
          courseId: courseData[0].id,
          courseTitle: courseData[0].title,
        }
      });
    } catch (logError) {
      // Non-blocking log error
      console.error('Failed to log course view', logError);
    }

    return NextResponse.json({
      course: courseData[0],
      isEnrolled: enrollment.length > 0,
    });
  } catch (error: any) {
    logger.error('Get course error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
