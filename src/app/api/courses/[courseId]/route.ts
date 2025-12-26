import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';

export async function GET(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const course = await db.query.courses.findFirst({
            where: eq(courses.id, parseInt(params.courseId)),
            with: {
                modules: {
                    with: {
                        chapters: true,
                    }
                }
            }
        });

        if (!course) {
            return NextResponse.json({ message: 'Course not found' }, { status: 404 });
        }

        return NextResponse.json({ course });
    } catch (error) {
        logger.error('Get course error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        // Validate request body
        const bodyValidation = await extractAndValidate(request, updateCourseSchema);
        if (!bodyValidation.success) {
            return bodyValidation.error;
        }
        const body = bodyValidation.data;
        const courseId = parseInt(params.courseId);

        // Update course
        const updatedCourse = await db.update(courses)
            .set({
                title: body.title,
                description: body.description,
                instructor: body.instructor,
                pricing: body.pricing,
                status: body.status,
                isDefaultUnlocked: body.isDefaultUnlocked,
                isRequestable: body.isRequestable,
                updatedAt: new Date(),
            })
            .where(eq(courses.id, courseId))
            .returning();

        if (!updatedCourse.length) {
            return NextResponse.json({ message: 'Course not found' }, { status: 404 });
        }

        securityLogger.info('Course Updated', { courseId, title: body.title });

        return NextResponse.json({
            message: 'Course updated successfully',
            course: updatedCourse[0]
        });

    } catch (error) {
        logger.error('Update course error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
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
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    console.log(`Deleting course: ${existingCourse.title} (ID: ${courseId})`);

    // Delete course (any admin can delete any course)
    await db.delete(courses).where(eq(courses.id, courseId));

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
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        const courseId = parseInt(params.courseId);

        const deletedCourse = await db.delete(courses)
            .where(eq(courses.id, courseId))
            .returning();

        if (!deletedCourse.length) {
            return NextResponse.json({ message: 'Course not found' }, { status: 404 });
        }

        securityLogger.info('Course Deleted', { courseId });

        return NextResponse.json({ message: 'Course deleted successfully' });

    } catch (error) {
        logger.error('Delete course error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
