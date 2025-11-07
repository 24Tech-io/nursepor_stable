import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
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
      { 
        message: 'Failed to create course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, title, description, instructor, thumbnail, pricing, status, isRequestable } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const [updatedCourse] = await db
      .update(courses)
      .set({
        ...(title && { title }),
        ...(description && { description }),
        ...(instructor && { instructor }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(pricing !== undefined && { pricing: pricing ? parseFloat(pricing) : null }),
        ...(status && { status }),
        ...(isRequestable !== undefined && { isRequestable }),
        updatedAt: new Date(),
      })
      .where(eq(courses.id, parseInt(id)))
      .returning();

    if (!updatedCourse) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

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
      { 
        message: 'Failed to update course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    await db
      .delete(courses)
      .where(eq(courses.id, parseInt(id)));

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

