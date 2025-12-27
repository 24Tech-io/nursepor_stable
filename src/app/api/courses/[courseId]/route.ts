import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';
import { securityLogger } from '@/lib/logger';

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
