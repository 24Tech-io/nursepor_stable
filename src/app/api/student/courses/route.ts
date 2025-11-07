import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Get all published courses
    const allCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'))
      .orderBy(desc(courses.createdAt));

    // Get student's enrolled courses
    const enrolledCourses = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, decoded.id));

    const enrolledCourseIds = new Set(enrolledCourses.map((ec: any) => ec.courseId.toString()));

    return NextResponse.json({
      courses: allCourses.map((course: any) => ({
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: course.status,
        isRequestable: course.isRequestable,
        isDefaultUnlocked: course.isDefaultUnlocked,
        isEnrolled: enrolledCourseIds.has(course.id.toString()),
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get student courses error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

