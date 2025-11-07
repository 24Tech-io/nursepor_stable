import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Get enrolled courses for the student
    const progress = await db
      .select({
        courseId: studentProgress.courseId,
        totalProgress: studentProgress.totalProgress,
        lastAccessed: studentProgress.lastAccessed,
        course: {
          id: courses.id,
          title: courses.title,
          description: courses.description,
          instructor: courses.instructor,
          thumbnail: courses.thumbnail,
          pricing: courses.pricing,
          status: courses.status,
        },
      })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          eq(courses.status, 'published')
        )
      );

    return NextResponse.json({
      enrolledCourses: progress.map((p: any) => ({
        courseId: p.courseId.toString(),
        progress: p.totalProgress,
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed).toISOString() : null,
        course: p.course,
      })),
    });
  } catch (error: any) {
    console.error('Get enrolled courses error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get enrolled courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

