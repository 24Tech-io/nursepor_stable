import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, questionBanks, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// This endpoint ensures a question bank exists for a course
export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const courseId = parseInt(params.courseId);
    if (isNaN(courseId)) {
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
    }

    const db = getDatabase();

    // Check if course exists
    const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);

    if (course.length === 0) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Check if user is enrolled
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseId)))
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this course' }, { status: 403 });
    }

    // Check if question bank exists
    const existingQBank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, courseId))
      .limit(1);

    let questionBank;
    if (existingQBank.length > 0) {
      questionBank = existingQBank[0];
    } else {
      // Create question bank automatically
      [questionBank] = await db
        .insert(questionBanks)
        .values({
          courseId: courseId,
          name: `${course[0].title} Q-Bank`,
          description: `Question bank for ${course[0].title}`,
          isActive: true,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      questionBank: {
        id: questionBank.id.toString(),
        name: questionBank.name,
        description: questionBank.description,
        courseId: questionBank.courseId.toString(),
      },
    });
  } catch (error: any) {
    console.error('Ensure Q-Bank error:', error);
    return NextResponse.json(
      {
        message: 'Failed to ensure question bank',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
