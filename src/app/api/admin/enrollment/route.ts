import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getStudentEnrollmentStatus } from '@/lib/enrollment-helpers';
import { enrollStudent, unenrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { withEnrollmentLock } from '@/lib/operation-lock';
import { createErrorResponse, createAuthError, createAuthzError, createValidationError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

/**
 * Unified Enrollment Management API
 * Handles all enrollment-related operations: requests, enroll, unenroll, and status checks
 */

// GET - Get enrollment status for a student
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

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
    const enrollmentStatus = await retryDatabase(
      () => getStudentEnrollmentStatus(studentIdNum)
    );

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
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

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

    // Use DataManager with operation lock to prevent race conditions
    const result = await withEnrollmentLock(studentIdNum, courseIdNum, async () => {
      return await enrollStudent({
        userId: studentIdNum,
        courseId: courseIdNum,
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
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

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

    // Use DataManager with operation lock to prevent race conditions
    const result = await withEnrollmentLock(studentIdNum, courseIdNum, async () => {
      return await unenrollStudent({
        userId: studentIdNum,
        courseId: courseIdNum,
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


