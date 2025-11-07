import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

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

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Get all courses from database
    const allCourses = await db
      .select()
      .from(courses)
      .orderBy(desc(courses.createdAt));

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
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

