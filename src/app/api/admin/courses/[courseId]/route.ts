import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const db = await getDatabaseWithRetry();
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
        isDefaultUnlocked: course.isDefaultUnlocked,
        isPublic: course.isPublic,
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Get course error:', error);
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
    const db = await getDatabaseWithRetry();
    const courseId = parseInt(params.courseId);
    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateCourseSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    logger.info('📝 [PUT /api/courses/:id] Request received:', {
      courseId,
      title: body.title,
      description: body.description?.substring(0, 50) + '...',
      instructor: body.instructor
    });

    const { title, description, instructor, thumbnail, pricing, status, isRequestable, isDefaultUnlocked, isPublic } = body;

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
    // Normalize status: "Active" or "active" -> "published" for consistency
    let newStatus = status !== undefined ? status : existingCourse.status;

    // Normalize status values to ensure consistency
    if (newStatus === 'Active' || newStatus === 'active' || newStatus === 'ACTIVE') {
      newStatus = 'published';
      logger.info(`🔄 Normalizing status: "${status}" → "published"`);
    }

    logger.info(`📝 Updating course ID ${courseId}: ${existingCourse.title}`);
    logger.info(`📝 Status change: ${existingCourse.status} → ${newStatus}`);

    const [updatedCourse] = await db
      .update(courses)
      .set({
        title: title || existingCourse.title,
        description: description || existingCourse.description,
        instructor: instructor || existingCourse.instructor,
        thumbnail: thumbnail !== undefined ? thumbnail : existingCourse.thumbnail,
        pricing: pricing !== undefined ? pricing : existingCourse.pricing,
        status: newStatus,
        isRequestable: isRequestable !== undefined ? isRequestable : existingCourse.isRequestable,
        isDefaultUnlocked: isDefaultUnlocked !== undefined ? isDefaultUnlocked : existingCourse.isDefaultUnlocked,
        isPublic: isPublic !== undefined ? isPublic : existingCourse.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    logger.info(`✅ Course updated: ${updatedCourse.title} (Status: ${updatedCourse.status})`);

    if (newStatus === 'published' && existingCourse.status !== 'published') {
      logger.info(`📢 Course "${updatedCourse.title}" is now published and visible to students!`);

      // Notify all students about the newly published course
      try {
        const { notifyNewCoursePublished } = await import('@/lib/sync-service');
        await notifyNewCoursePublished(updatedCourse.id, updatedCourse.title);
      } catch (notifError) {
        logger.error('Failed to notify students about published course:', notifError);
        // Don't fail the update if notification fails
      }
    }

    // Log activity
    const token = request.cookies.get('adminToken')?.value;
    if (token) {
      const decoded = await verifyToken(token);
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
    logger.error('Update course error:', error);
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
      logger.error('Delete course: No token found');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      logger.error('Delete course: Invalid token or not admin', { decoded });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const courseId = parseInt(params.courseId);

    if (isNaN(courseId)) {
      logger.error('Delete course: Invalid course ID', params.courseId);
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    logger.info(`Attempting to delete course with ID: ${courseId}`);

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      logger.error('Delete course: Course not found', courseId);
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    logger.info(`Deleting course: ${existingCourse.title} (ID: ${courseId})`);

    // Delete course (any admin can delete any course)
    await db
      .delete(courses)
      .where(eq(courses.id, courseId));

    logger.info(`Successfully deleted course with ID: ${courseId}`);

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
    logger.error('Delete course error:', error);
    logger.error('Error details:', {
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

// PATCH handler (alias for PUT for compatibility with admin UI)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  return PUT(request, { params });
}

