import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { extractAndValidate } from '@/lib/api-validation';
import { enrollStudentSchema } from '@/lib/validation-schemas-extended';

/**
 * POST - Direct enrollment for public courses
 * Students can enroll directly in public courses without approval
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, enrollStudentSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { courseId } = bodyValidation.data;

    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(courseId.toString());
    const studentId = decoded.id;

    // Get course details
    const courseData = await db.select().from(courses).where(eq(courses.id, courseIdNum)).limit(1);

    if (courseData.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    const course = courseData[0];

    // Check if course is published
    const normalizedStatus = course.status?.toLowerCase();
    if (normalizedStatus !== 'published' && normalizedStatus !== 'active') {
      return NextResponse.json(
        { message: 'Course is not available for enrollment' },
        { status: 400 }
      );
    }

    // Check if course is public (allows direct enrollment)
    if (!course.isPublic) {
      return NextResponse.json(
        {
          message: 'This course requires admin approval. Please use the request access feature.',
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    // Use DataManager for enrollment (with validation, transaction, and event emission)
    const result = await enrollStudent({
      userId: studentId,
      courseId: courseIdNum,
      source: 'student',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error?.message || 'Failed to enroll in course',
          error: result.error?.code,
          details: result.error?.details,
        },
        { status: result.error?.retryable ? 503 : 400 }
      );
    }

    return NextResponse.json({
      message: 'Successfully enrolled in course',
      enrolled: true,
      courseId: courseIdNum,
      operationId: result.operationId,
      syncResult: result.data,
    });
  } catch (error: any) {
    logger.error('Direct enrollment error:', error);
    return NextResponse.json(
      {
        message: 'Failed to enroll in course',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
