import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users, studentProgress, courses, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';
import { enrollStudent, unenrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { withEnrollmentLock } from '@/lib/operation-lock';
import { createErrorResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateRouteParams } from '@/lib/api-validation';
import { enrollStudentSchema, unenrollStudentSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

// POST - Enroll student in a course
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate route params
    const paramsValidation = validateRouteParams(
      z.object({ id: z.string().regex(/^\d+$/, 'Invalid student ID') }),
      params
    );
    if (!paramsValidation.success) {
      return paramsValidation.error;
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, enrollStudentSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { courseId } = bodyValidation.data;

    const db = await getDatabaseWithRetry();
    const studentId = parseInt(params.id);

    // Verify student exists and is a student
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Verify course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Check if already enrolled
    const [existing] = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.courseId, courseId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: 'Student is already enrolled in this course' }, { status: 400 });
    }

    // Enroll student using data-manager to ensure dual-table sync
    const result = await withEnrollmentLock(studentId, courseId, async () => {
      return await enrollStudent({
        userId: studentId,
        courseId: courseId,
        adminId: decoded.id,
        source: 'admin',
      });
    });

    if (!result.success) {
      return createErrorResponse(
        result.error,
        result.error?.message || 'Failed to enroll student',
        result.error?.retryable ? 503 : 400
      );
    }

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'created',
      entityType: 'student',
      entityId: studentId,
      entityName: `Enrolled in ${course.title}`,
      details: {
        studentName: student.name,
        courseId: courseId,
        courseTitle: course.title,
      },
    });

    return NextResponse.json({
      message: 'Student enrolled successfully',
      success: true,
    });
  } catch (error: any) {
    logger.error('Enroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to enroll student', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unenroll student from a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate route params
    const paramsValidation = validateRouteParams(
      z.object({ id: z.string().regex(/^\d+$/, 'Invalid student ID') }),
      params
    );
    if (!paramsValidation.success) {
      return paramsValidation.error;
    }

    // Validate query params
    const { searchParams } = new URL(request.url);
    const courseIdParam = searchParams.get('courseId');
    if (!courseIdParam) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    const courseIdValidation = unenrollStudentSchema.safeParse({ courseId: parseInt(courseIdParam) });
    if (!courseIdValidation.success) {
      return NextResponse.json(
        { message: 'Invalid course ID format', errors: courseIdValidation.error.issues },
        { status: 400 }
      );
    }
    const courseId = courseIdValidation.data.courseId;

    const db = await getDatabaseWithRetry();
    const studentId = parseInt(params.id);

    // Verify student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Get course info for logging
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    // Unenroll student using data-manager to ensure dual-table sync
    const result = await withEnrollmentLock(studentId, courseId, async () => {
      return await unenrollStudent({
        userId: studentId,
        courseId: courseId,
        adminId: decoded.id,
        reason: 'Admin unenrollment',
      });
    });

    if (!result.success) {
      return createErrorResponse(
        result.error,
        result.error?.message || 'Failed to unenroll student',
        result.error?.retryable ? 503 : 400
      );
    }

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'deleted',
      entityType: 'student',
      entityId: studentId,
      entityName: `Unenrolled from ${course?.title || 'course'}`,
      details: {
        studentName: student.name,
        courseId: courseId,
        courseTitle: course?.title,
      },
    });

    return NextResponse.json({
      message: 'Student unenrolled successfully',
      success: true,
    });
  } catch (error: any) {
    logger.error('Unenroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to unenroll student', error: error.message },
      { status: 500 }
    );
  }
}



