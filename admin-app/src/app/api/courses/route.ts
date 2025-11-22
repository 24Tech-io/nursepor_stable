import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
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
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get courses error:', error);
    return NextResponse.json(
      { message: 'Failed to get courses', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, instructor, thumbnail, pricing, status, isRequestable } = body;

    if (!title || !description || !instructor) {
      return NextResponse.json(
        { message: 'Title, description, and instructor are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        instructor,
        thumbnail: thumbnail || null,
        pricing: pricing ? parseFloat(pricing) : null,
        status: status || 'draft',
        isRequestable: isRequestable !== undefined ? isRequestable : true,
      })
      .returning();

    return NextResponse.json({
      course: {
        id: newCourse.id.toString(),
        title: newCourse.title,
        description: newCourse.description,
        instructor: newCourse.instructor,
        thumbnail: newCourse.thumbnail,
        pricing: newCourse.pricing || 0,
        status: newCourse.status,
        isRequestable: newCourse.isRequestable,
        createdAt: newCourse.createdAt?.toISOString(),
        updatedAt: newCourse.updatedAt?.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json(
      { message: 'Failed to create course', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
