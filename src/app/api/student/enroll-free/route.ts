import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { message: 'Course ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const courseIdNum = parseInt(courseId);

    // Get course
    const courseData = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseIdNum))
      .limit(1);

    if (courseData.length === 0) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseData[0];

    // Check if course is free
    if (course.pricing && course.pricing > 0) {
      return NextResponse.json(
        { message: 'This course is not free. Please use the payment flow.' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, courseIdNum)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      return NextResponse.json(
        { message: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    // Create free payment record
    await db.insert(payments).values({
      userId: decoded.id,
      courseId: courseIdNum,
      amount: 0,
      currency: 'INR',
      status: 'completed',
      paymentMethod: 'free',
      transactionId: `FREE-${Date.now()}-${decoded.id}`,
    });

    // Enroll student
    await db.insert(studentProgress).values({
      studentId: decoded.id,
      courseId: courseIdNum,
      completedChapters: '[]',
      watchedVideos: '[]',
      quizAttempts: '[]',
      totalProgress: 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course',
    });
  } catch (error: any) {
    console.error('Free enrollment error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to enroll',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

