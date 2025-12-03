import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = getDatabase();
    const courseIdNum = parseInt(params.courseId);

    // Get course
    const courseData = await db.select().from(courses).where(eq(courses.id, courseIdNum)).limit(1);

    if (courseData.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Check enrollment
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseIdNum))
      )
      .limit(1);

    return NextResponse.json({
      course: courseData[0],
      isEnrolled: enrollment.length > 0,
    });
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
