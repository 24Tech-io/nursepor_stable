import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getStudentEnrollmentStatus } from '@/lib/enrollment-helpers';
import { enrollStudent, unenrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { withEnrollmentLock } from '@/lib/operation-lock';
import { studentProgress, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createErrorResponse,
  createAuthError,
  createAuthzError,
  createValidationError,
} from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

/**
 * Unified Enrollment Management API
 * Handles all enrollment-related operations: requests, enroll, unenroll, and status checks
 */

// GET - Get enrollment status for a student
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return createAuthzError('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return createValidationError('Student ID is required');
    }

    const studentIdNum = parseInt(studentId);
    if (isNaN(studentIdNum)) {
      return createValidationError('Invalid student ID');
    }

    // Use unified helper to get enrollment status for all courses with retry
    const enrollmentStatus = await retryDatabase(() => getStudentEnrollmentStatus(studentIdNum));

    return NextResponse.json({
      studentId: studentIdNum,
      enrollments: enrollmentStatus,
      summary: {
        total: enrollmentStatus.length,
        enrolled: enrollmentStatus.filter((e: any) => e.enrollmentStatus === 'enrolled').length,
        requested: enrollmentStatus.filter((e: any) => e.enrollmentStatus === 'requested').length,
        available: enrollmentStatus.filter((e: any) => e.enrollmentStatus === 'available').length,
      },
    });
  } catch (error: any) {
    console.error('Get enrollment status error:', error);
    return createErrorResponse(error, 'Failed to get enrollment status');
  }
}

// POST - Enroll student in a course (direct enrollment by admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return createAuthzError('Admin access required');
    }

    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return createValidationError('Student ID and Course ID are required');
    }

    const studentIdNum = parseInt(studentId);
    const courseIdNum = parseInt(courseId);

    if (isNaN(studentIdNum) || isNaN(courseIdNum)) {
      return createValidationError('Invalid student ID or course ID');
    }

    // IDEMPOTENCY CHECK: See if already enrolled
    const db = getDatabase();
    
    const [existingProgress, existingEnrollment] = await Promise.all([
      db.select()
        .from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, studentIdNum),
          eq(studentProgress.courseId, courseIdNum)
        ))
        .limit(1),
      db.select()
        .from(enrollments)
        .where(and(
          eq(enrollments.userId, studentIdNum),
          eq(enrollments.courseId, courseIdNum)
        ))
        .limit(1)
    ]);

    // If fully enrolled and active, return success (idempotent)
    if (existingProgress.length > 0 && existingEnrollment.length > 0) {
      if (existingEnrollment[0].status === 'active') {
        console.log(`ℹ️ Student ${studentIdNum} already enrolled in course ${courseIdNum} - returning success`);
        return NextResponse.json({
          message: 'Student is already enrolled in this course',
          enrolled: true,
          alreadyEnrolled: true,
        });
      } else {
        // Reactivate enrollment
        await db.update(enrollments)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(enrollments.id, existingEnrollment[0].id));
        
        console.log(`✅ Reactivated enrollment for student ${studentIdNum} in course ${courseIdNum}`);
        return NextResponse.json({
          message: 'Enrollment reactivated successfully',
          enrolled: true,
          reactivated: true,
        });
      }
    }

    // Use DataManager with operation lock to prevent race conditions
    let result;
    try {
      result = await withEnrollmentLock(studentIdNum, courseIdNum, async () => {
        return await enrollStudent({
          userId: studentIdNum,
          courseId: courseIdNum,
          adminId: decoded.id,
          source: 'admin',
        });
      });
    } catch (lockError: any) {
      console.error('Lock error during enrollment:', lockError);
      return NextResponse.json({
        message: 'Enrollment operation timed out. Please try again.',
        error: lockError.message,
        code: 'LOCK_TIMEOUT',
        retryable: true,
        hint: 'This usually happens if another operation is in progress. Wait a moment and retry.'
      }, { status: 503 });
    }

    if (!result.success) {
      return NextResponse.json({
        message: result.error?.message || 'Failed to enroll student',
        error: result.error?.code || 'ENROLLMENT_FAILED',
        details: result.error?.details,
        retryable: result.error?.retryable || false,
        hint: result.error?.retryable 
          ? 'This error may be temporary. Please try again.'
          : 'Please check the details and contact support if issue persists.'
      }, { status: result.error?.retryable ? 503 : 400 });
    }

    return NextResponse.json({
      message: 'Student enrolled successfully',
      enrolled: true,
      operationId: result.operationId,
    });
  } catch (error: any) {
    console.error('Enroll student error:', error);
    return createErrorResponse(error, 'Failed to enroll student');
  }
}

// DELETE - Unenroll student from a course
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return createAuthzError('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !courseId) {
      return createValidationError('Student ID and Course ID are required');
    }

    const studentIdNum = parseInt(studentId);
    const courseIdNum = parseInt(courseId);

    if (isNaN(studentIdNum) || isNaN(courseIdNum)) {
      return createValidationError('Invalid student ID or course ID');
    }

    // IDEMPOTENCY CHECK: See if actually enrolled
    const db = getDatabase();
    
    const [existingProgress, existingEnrollment] = await Promise.all([
      db.select()
        .from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, studentIdNum),
          eq(studentProgress.courseId, courseIdNum)
        ))
        .limit(1),
      db.select()
        .from(enrollments)
        .where(and(
          eq(enrollments.userId, studentIdNum),
          eq(enrollments.courseId, courseIdNum)
        ))
        .limit(1)
    ]);

    // If not enrolled, return success anyway (idempotent)
    if (existingProgress.length === 0 && existingEnrollment.length === 0) {
      console.log(`ℹ️ Student ${studentIdNum} not enrolled in course ${courseIdNum} - returning success anyway`);
      return NextResponse.json({
        message: 'Student is not enrolled in this course (already unenrolled)',
        unenrolled: true,
        notEnrolled: true,
      });
    }

    // Use DataManager with operation lock to prevent race conditions
    let result;
    try {
      result = await withEnrollmentLock(studentIdNum, courseIdNum, async () => {
        return await unenrollStudent({
          userId: studentIdNum,
          courseId: courseIdNum,
          adminId: decoded.id,
          reason: 'Admin unenrollment',
        });
      });
    } catch (lockError: any) {
      console.error('Lock error during unenrollment:', lockError);
      return NextResponse.json({
        message: 'Unenrollment operation timed out. Please try again.',
        error: lockError.message,
        code: 'LOCK_TIMEOUT',
        retryable: true,
        hint: 'This usually happens if another operation is in progress. Wait a moment and retry.'
      }, { status: 503 });
    }

    if (!result.success) {
      return NextResponse.json({
        message: result.error?.message || 'Failed to unenroll student',
        error: result.error?.code || 'UNENROLLMENT_FAILED',
        details: result.error?.details,
        retryable: result.error?.retryable || false,
        hint: result.error?.retryable
          ? 'This error may be temporary. Please try again.'
          : 'Please check the details and contact support if issue persists.'
      }, { status: result.error?.retryable ? 503 : 400 });
    }

    return NextResponse.json({
      message: 'Student unenrolled successfully',
      unenrolled: true,
      operationId: result.operationId,
    });
  } catch (error: any) {
    console.error('Unenroll student error:', error);
    return createErrorResponse(error, 'Failed to unenroll student');
  }
}
