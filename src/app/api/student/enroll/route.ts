import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST - Direct enrollment for public courses
 * Students can enroll directly in public courses without approval
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const courseIdNum = parseInt(courseId.toString());
    const studentId = decoded.id;

    // Get course details
    const courseData = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseIdNum))
      .limit(1);

    if (courseData.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    const course = courseData[0];

    // Check if course is published
    if (course.status !== 'published' && course.status !== 'active' && course.status !== 'Active') {
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
          requiresApproval: true
        },
        { status: 403 }
      );
    }

    // Check if already enrolled
    const existingProgress = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.courseId, courseIdNum)
        )
      )
      .limit(1);

    if (existingProgress.length > 0) {
      return NextResponse.json(
        { message: 'You are already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if there's a pending request (shouldn't happen for public courses, but check anyway)
    const pendingRequest = await db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, studentId),
          eq(accessRequests.courseId, courseIdNum),
          eq(accessRequests.status, 'pending')
        )
      )
      .limit(1);

    if (pendingRequest.length > 0) {
      // Cancel the pending request since we're enrolling directly
      await db
        .update(accessRequests)
        .set({
          status: 'rejected',
          reviewedAt: new Date(),
        })
        .where(eq(accessRequests.id, pendingRequest[0].id));
    }

    // Enroll student directly (Legacy studentProgress)
    const [newProgress] = await db
      .insert(studentProgress)
      .values({
        studentId,
        courseId: courseIdNum,
        totalProgress: 0,
      })
      .returning();

    // Enroll student directly (New enrollments table)
    await db.insert(enrollments).values({
      userId: studentId,
      courseId: courseIdNum,
      status: 'active',
      progress: 0,
    });

    console.log(`✅ Student ${studentId} enrolled directly in public course ${courseIdNum}`);

    return NextResponse.json({
      message: 'Successfully enrolled in course',
      enrolled: true,
      courseId: courseIdNum,
      progressId: newProgress.id,
    });
  } catch (error: any) {
    console.error('Direct enrollment error:', error);
    return NextResponse.json(
      {
        message: 'Failed to enroll in course',
        error: error.message
      },
      { status: 500 }
    );
  }
}


