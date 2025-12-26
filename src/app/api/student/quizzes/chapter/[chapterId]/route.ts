import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch quiz for a chapter
export async function GET(request: NextRequest, { params }: { params: { chapterId: string } }) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const chapterId = parseInt(params.chapterId);
    const db = await getDatabaseWithRetry();

    // Get quiz for chapter
    const chapterQuizzes = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.chapterId, chapterId), eq(quizzes.isPublished, true)));

    if (chapterQuizzes.length === 0) {
      return NextResponse.json({ message: 'No quiz found for this chapter' }, { status: 404 });
    }

    // Return first published quiz
    return NextResponse.json({ quiz: chapterQuizzes[0] });
  } catch (error: any) {
    logger.error('Get chapter quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quiz', error: error.message },
      { status: 500 }
    );
  }
}
