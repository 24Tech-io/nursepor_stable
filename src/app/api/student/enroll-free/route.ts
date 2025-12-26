import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { enrollStudentSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, payments, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, enrollStudentSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { courseId } = bodyValidation.data;

    const db = await getDatabaseWithRetry();
    const courseIdNum = courseId;

    // Get course
    const courseData = await db.select().from(courses).where(eq(courses.id, courseIdNum)).limit(1);

    if (courseData.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    const course = courseData[0];

    // Check if course is free
    if (course.pricing && course.pricing > 0) {
      return NextResponse.json(
        { message: 'This course is not free. Please use the payment flow.' },
        { status: 400 }
      );
    }

    // Use DataManager for enrollment (with validation, transaction, and event emission)
    const enrollmentResult = await enrollStudent({
      userId: decoded.id,
      courseId: courseIdNum,
      source: 'payment',
    });

    if (!enrollmentResult.success) {
      return NextResponse.json(
        {
          message: enrollmentResult.error?.message || 'Failed to enroll',
          error: enrollmentResult.error?.code,
          details: enrollmentResult.error?.details,
        },
        { status: enrollmentResult.error?.retryable ? 503 : 400 }
      );
    }

    // Create free payment record in separate transaction
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        userId: decoded.id,
        courseId: courseIdNum,
        amount: 0,
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'free',
        transactionId: `FREE-${Date.now()}-${decoded.id}`,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course',
    });
  } catch (error: any) {
    logger.error('Free enrollment error:', error);
    return NextResponse.json(
      {
        message: 'Failed to enroll',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
