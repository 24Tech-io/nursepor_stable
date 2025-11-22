import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      course: {
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
      },
    });
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      { message: 'Failed to get course', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);
    const body = await request.json();
    const { title, description, instructor, thumbnail, pricing, status, isRequestable } = body;

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    // Update course (any admin can edit any course)
    const [updatedCourse] = await db
      .update(courses)
      .set({
        title: title || existingCourse.title,
        description: description || existingCourse.description,
        instructor: instructor || existingCourse.instructor,
        thumbnail: thumbnail !== undefined ? thumbnail : existingCourse.thumbnail,
        pricing: pricing !== undefined ? (pricing ? parseFloat(pricing) : null) : existingCourse.pricing,
        status: status || existingCourse.status,
        isRequestable: isRequestable !== undefined ? isRequestable : existingCourse.isRequestable,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    return NextResponse.json({
      course: {
        id: updatedCourse.id.toString(),
        title: updatedCourse.title,
        description: updatedCourse.description,
        instructor: updatedCourse.instructor,
        thumbnail: updatedCourse.thumbnail,
        pricing: updatedCourse.pricing || 0,
        status: updatedCourse.status,
        isRequestable: updatedCourse.isRequestable,
        createdAt: updatedCourse.createdAt?.toISOString(),
        updatedAt: updatedCourse.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json(
      { message: 'Failed to update course', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    // Delete course (any admin can delete any course)
    await db
      .delete(courses)
      .where(eq(courses.id, courseId));

    return NextResponse.json({
      message: 'Course deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { message: 'Failed to delete course', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

