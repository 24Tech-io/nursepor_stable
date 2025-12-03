import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress, courses, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { enrollStudent, unenrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';

/**
 * Unified Enrollment Management API
 * Handles all enrollment-related operations: requests, enroll, unenroll, and status checks
 */

// GET - Get enrollment status for a student
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ message: 'Student ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const studentIdNum = parseInt(studentId);

    // Get all courses
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        status: courses.status,
      })
      .from(courses)
      .where(getPublishedCourseFilter());

    // Get enrolled courses from BOTH tables (studentProgress + enrollments)
    let enrolledProgress: any[] = [];
    let enrolledRecords: any[] = [];
    
    try {
      // Try to get from studentProgress table
      enrolledProgress = await db
        .select({
          courseId: studentProgress.courseId,
          progress: studentProgress.totalProgress,
          lastAccessed: studentProgress.lastAccessed,
        })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, studentIdNum));
    } catch (progressError: any) {
      console.error('⚠️ Error fetching from studentProgress:', progressError);
      enrolledProgress = [];
    }

    try {
      // Try to get from enrollments table (new source of truth)
      enrolledRecords = await db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
          lastAccessed: enrollments.enrolledAt, // Use enrolledAt for now (updatedAt may not exist in DB yet)
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, studentIdNum),
            eq(enrollments.status, 'active')
          )
        );
    } catch (enrollmentsError: any) {
      console.error('⚠️ Error fetching from enrollments table:', enrollmentsError);
      console.error('⚠️ This might mean the enrollments table or column does not exist yet');
      enrolledRecords = [];
    }

    // Merge enrollments from both tables - prefer enrollments table (new source of truth)
    const enrollmentMap = new Map();
    
    // First, add all from enrollments table (new source of truth)
    enrolledRecords.forEach((e: any) => {
      const courseIdStr = e.courseId.toString();
      enrollmentMap.set(courseIdStr, {
        courseId: e.courseId,
        progress: e.progress || 0,
        lastAccessed: e.lastAccessed,
      });
    });

    // Then, add any from studentProgress that aren't in enrollments (legacy data)
    enrolledProgress.forEach((e: any) => {
      const courseIdStr = e.courseId.toString();
      if (!enrollmentMap.has(courseIdStr)) {
        enrollmentMap.set(courseIdStr, {
          courseId: e.courseId,
          progress: e.progress || 0,
          lastAccessed: e.lastAccessed,
        });
      } else {
        // Update lastAccessed if studentProgress is more recent
        const existing = enrollmentMap.get(courseIdStr);
        if (e.lastAccessed && (!existing.lastAccessed || e.lastAccessed > existing.lastAccessed)) {
          existing.lastAccessed = e.lastAccessed;
        }
      }
    });

    const mergedEnrollments = Array.from(enrollmentMap.values());
    const enrolledCourseIds = new Set(mergedEnrollments.map((ep: any) => ep.courseId.toString()));

    // Get pending requests only - approved requests should have been deleted after approval
    // If approved requests exist, they're stale and will be cleaned up, but we don't show them
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
        requestedAt: accessRequests.requestedAt,
        reason: accessRequests.reason,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentIdNum),
          eq(accessRequests.status, 'pending')
        )
      );

    const pendingRequestCourseIds = new Set(pendingRequests.map((r: any) => r.courseId.toString()));

    // Build enrollment status for each course
    // CRITICAL: Only mark as "enrolled" if actual enrollment records exist
    const enrollmentStatus = allCourses.map((course: any) => {
      const courseIdStr = course.id.toString();
      // Only check actual enrollment records
      const isEnrolled = enrolledCourseIds.has(courseIdStr);
      const hasPendingRequest = pendingRequestCourseIds.has(courseIdStr);
      const progressData = mergedEnrollments.find((ep: any) => ep.courseId.toString() === courseIdStr);

      let status: 'enrolled' | 'requested' | 'available' = 'available';
      // Only mark as enrolled if actual enrollment records exist
      if (isEnrolled) {
        status = 'enrolled';
      } else if (hasPendingRequest) {
        // Pending request - show as requested
        status = 'requested';
      }

      return {
        courseId: course.id,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          status: course.status,
        },
        enrollmentStatus: status,
        progress: progressData?.progress || 0,
        lastAccessed: progressData?.lastAccessed || null,
        requestedAt: hasPendingRequest
          ? pendingRequests.find((pr: any) => pr.courseId.toString() === courseIdStr)?.requestedAt || null
          : null,
      };
    });

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
    console.error('❌ Get enrollment status error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json(
      { 
        message: 'Failed to get enrollment status', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Enroll student in a course (direct enrollment by admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return NextResponse.json(
        { message: 'Student ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Use DataManager for enrollment (with validation, transaction, and event emission)
    const result = await enrollStudent({
      userId: parseInt(studentId),
      courseId: parseInt(courseId),
      adminId: decoded.id,
      source: 'admin',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error?.message || 'Failed to enroll student',
          error: result.error?.code,
          details: result.error?.details,
        },
        { status: result.error?.retryable ? 503 : 400 }
      );
    }

    return NextResponse.json({
      message: 'Student enrolled successfully',
      enrolled: true,
      operationId: result.operationId,
      syncResult: result.data,
    });
  } catch (error: any) {
    console.error('Enroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to enroll student', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unenroll student from a course
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !courseId) {
      return NextResponse.json(
        { message: 'Student ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Use DataManager for unenrollment (with validation, transaction, and event emission)
    const result = await unenrollStudent({
      userId: parseInt(studentId),
      courseId: parseInt(courseId),
      adminId: decoded.id,
      reason: 'Admin unenrollment',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error?.message || 'Failed to unenroll student',
          error: result.error?.code,
          details: result.error?.details,
        },
        { status: result.error?.retryable ? 503 : 400 }
      );
    }

    return NextResponse.json({
      message: 'Student unenrolled successfully',
      unenrolled: true,
      operationId: result.operationId,
      deleted: result.data?.deleted,
    });
  } catch (error: any) {
    console.error('Unenroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to unenroll student', error: error.message },
      { status: 500 }
    );
  }
}


