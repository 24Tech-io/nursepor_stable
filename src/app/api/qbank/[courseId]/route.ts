import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { questionBanks, courses, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(params.courseId);

    // Check if user is enrolled in the course
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, courseIdNum)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json(
        { message: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Get question bank for this course
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(
        and(
          eq(questionBanks.courseId, courseIdNum),
          eq(questionBanks.isActive, true)
        )
      )
      .limit(1);

    if (qbank.length === 0) {
      // Auto-create question bank if it doesn't exist
      const courseData = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseIdNum))
        .limit(1);

      if (courseData.length > 0) {
        const [newQBank] = await db
          .insert(questionBanks)
          .values({
            courseId: courseIdNum,
            name: `${courseData[0].title} Q-Bank`,
            description: `Question bank for ${courseData[0].title}`,
            isActive: true,
          })
          .returning();

        return NextResponse.json({
          questionBank: newQBank,
        });
      }

      // Return empty question bank if course doesn't exist
      return NextResponse.json({
        questionBank: null,
        message: 'No question bank found for this course',
      });
    }

    return NextResponse.json({
      questionBank: qbank[0],
    });
  } catch (error: any) {
    logger.error('Get question bank error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

