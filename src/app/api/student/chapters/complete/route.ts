import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { studentProgress, chapters, modules } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { verifyToken } from '@/lib/auth';
import { markChapterComplete } from '@/lib/data-manager/helpers/progress-helper';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
    }

    let user;
    try {
      user = verifyToken(token);
      if (!user || !user.id) {
        return NextResponse.json({ message: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Unauthorized - Token verification failed', error: error.message },
        { status: 401 }
      );
    }

    const userId = user.id;
    const { chapterId, courseId } = await request.json();

    if (!chapterId || !courseId) {
      return NextResponse.json(
        { message: 'Chapter ID and Course ID are required' },
        { status: 400 }
      );
    }

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database connection error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection error',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
        { status: 500 }
      );
    }

    // Verify chapter exists
    let chapter;
    try {
      chapter = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, Number(chapterId)))
        .limit(1);
    } catch (error: any) {
      console.error('❌ Error fetching chapter:', error);
      return NextResponse.json(
        {
          message: 'Error fetching chapter',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    if (!chapter.length) {
      return NextResponse.json({ message: 'Chapter not found' }, { status: 404 });
    }

    // Get or create student progress
    let existingProgress;
    try {
      existingProgress = await db
        .select()
        .from(studentProgress)
        .where(
          and(eq(studentProgress.studentId, userId), eq(studentProgress.courseId, Number(courseId)))
        )
        .limit(1);
    } catch (error: any) {
      console.error('❌ Error fetching student progress:', error);
      return NextResponse.json(
        {
          message: 'Error fetching student progress',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Use DataManager for chapter completion (with validation, transaction, dual-table sync, and events)
    const result = await markChapterComplete(userId, Number(courseId), Number(chapterId));

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.error?.message || 'Failed to mark chapter complete',
          error: result.error?.code,
          details: result.error?.details,
        },
        { status: result.error?.retryable ? 503 : 400 }
      );
    }

    return NextResponse.json({
      message: 'Chapter marked as complete',
      chapterId: Number(chapterId),
      success: true,
    });
  } catch (error: any) {
    console.error('Mark chapter complete error:', error);
    return NextResponse.json(
      { message: 'Failed to mark chapter complete', error: error.message },
      { status: 500 }
    );
  }
}
