import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress, courses } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

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
      .where(or(eq(courses.status, 'published'), eq(courses.status, 'active')));

    // Get enrolled courses (studentProgress entries)
    const enrolledProgress = await db
      .select({
        courseId: studentProgress.courseId,
        progress: studentProgress.totalProgress,
        lastAccessed: studentProgress.lastAccessed,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentIdNum));

    const enrolledCourseIds = new Set(enrolledProgress.map((ep: any) => ep.courseId.toString()));

    // Get pending requests
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

    const pendingRequestCourseIds = new Set(pendingRequests.map((pr: any) => pr.courseId.toString()));

    // Build enrollment status for each course
    const enrollmentStatus = allCourses.map((course: any) => {
      const courseIdStr = course.id.toString();
      const isEnrolled = enrolledCourseIds.has(courseIdStr);
      const hasPendingRequest = pendingRequestCourseIds.has(courseIdStr);
      const progressData = enrolledProgress.find((ep: any) => ep.courseId.toString() === courseIdStr);

      let status: 'enrolled' | 'requested' | 'available' = 'available';
      if (isEnrolled) {
        status = 'enrolled';
      } else if (hasPendingRequest) {
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
          ? pendingRequests.find((pr: any) => pr.courseId.toString() === courseIdStr)?.requestedAt
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
    console.error('Get enrollment status error:', error);
    return NextResponse.json(
      { message: 'Failed to get enrollment status', error: error.message },
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

    const db = getDatabase();

    // Check if already enrolled
    const existing = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, parseInt(studentId)),
          eq(studentProgress.courseId, parseInt(courseId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Student is already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if there's a pending request - if so, approve it first
    const pendingRequest = await db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, parseInt(studentId)),
          eq(accessRequests.courseId, parseInt(courseId)),
          eq(accessRequests.status, 'pending')
        )
      )
      .limit(1);

    if (pendingRequest.length > 0) {
      // Update request to approved
      await db
        .update(accessRequests)
        .set({
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: decoded.id,
        })
        .where(eq(accessRequests.id, pendingRequest[0].id));
    }

    // Create enrollment
    await db.insert(studentProgress).values({
      studentId: parseInt(studentId),
      courseId: parseInt(courseId),
      totalProgress: 0,
    });

    console.log(`✅ Student ${studentId} enrolled in course ${courseId}`);

    return NextResponse.json({
      message: 'Student enrolled successfully',
      enrolled: true,
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

    const db = getDatabase();

    // Delete enrollment
    const result = await db
      .delete(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, parseInt(studentId)),
          eq(studentProgress.courseId, parseInt(courseId))
        )
      );

    console.log(`✅ Student ${studentId} unenrolled from course ${courseId}`);

    return NextResponse.json({
      message: 'Student unenrolled successfully',
      unenrolled: true,
    });
  } catch (error: any) {
    console.error('Unenroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to unenroll student', error: error.message },
      { status: 500 }
    );
  }
}


