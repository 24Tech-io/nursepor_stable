import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

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

    // Log activity
    const token = request.cookies.get('adminToken')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        await logActivity({
          adminId: decoded.id,
          adminName: decoded.name,
          action: 'updated',
          entityType: 'course',
          entityId: courseId,
          entityName: updatedCourse.title,
          details: {
            changes: {
              title: title !== existingCourse.title ? { from: existingCourse.title, to: title } : undefined,
              status: status !== existingCourse.status ? { from: existingCourse.status, to: status } : undefined,
            }
          }
        });
      }
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
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      console.error('Delete course: No token found');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      console.error('Delete course: Invalid token or not admin', { decoded });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    if (isNaN(courseId)) {
      console.error('Delete course: Invalid course ID', params.courseId);
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    console.log(`Attempting to delete course with ID: ${courseId}`);

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      console.error('Delete course: Course not found', courseId);
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    console.log(`Deleting course: ${existingCourse.title} (ID: ${courseId})`);

    // Delete course (any admin can delete any course)
    await db
      .delete(courses)
      .where(eq(courses.id, courseId));

    console.log(`Successfully deleted course with ID: ${courseId}`);

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'deleted',
      entityType: 'course',
      entityId: courseId,
      entityName: existingCourse.title,
    });

    return NextResponse.json({
      message: 'Course deleted successfully',
      deletedId: courseId,
    });
  } catch (error: any) {
    console.error('Delete course error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { 
        message: 'Failed to delete course', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

