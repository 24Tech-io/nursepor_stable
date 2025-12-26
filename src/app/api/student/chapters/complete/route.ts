import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, chapters, modules, enrollments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { verifyToken } from '@/lib/auth';
import { markChapterComplete } from '@/lib/data-manager/helpers/progress-helper';
import { extractAndValidate } from '@/lib/api-validation';
import { chapterCompleteSchema } from '@/lib/validation-schemas-extended';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        let user;
        try {
            user = await verifyToken(token);
            if (!user || !user.id) {
                return NextResponse.json(
                    { message: 'Unauthorized - Invalid token' },
                    { status: 401 }
                );
            }
        } catch (error: any) {
            logger.error('Token verification error:', error);
            return NextResponse.json(
                { message: 'Unauthorized - Token verification failed', error: error.message },
                { status: 401 }
            );
        }

        const userId = user.id;

        // Validate request body
        const bodyValidation = await extractAndValidate(request, chapterCompleteSchema);
        if (!bodyValidation.success) {
            return bodyValidation.error;
        }
        const { chapterId, courseId } = bodyValidation.data;

        let db;
        try {
            db = await getDatabaseWithRetry();
        } catch (dbError: any) {
            logger.error('❌ Database connection error:', dbError);
            return NextResponse.json(
                {
                    message: 'Database connection error',
                    error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
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
            logger.error('❌ Error fetching chapter:', error);
            return NextResponse.json(
                {
                    message: 'Error fetching chapter',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }

        if (!chapter.length) {
            return NextResponse.json(
                { message: 'Chapter not found' },
                { status: 404 }
            );
        }

        // Get or create student progress
        let existingProgress;
        try {
            existingProgress = await db
                .select()
                .from(studentProgress)
                .where(
                    and(
                        eq(studentProgress.studentId, userId),
                        eq(studentProgress.courseId, Number(courseId))
                    )
                )
                .limit(1);
        } catch (error: any) {
            logger.error('❌ Error fetching student progress:', error);
            return NextResponse.json(
                {
                    message: 'Error fetching student progress',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }

        // Verify enrollment
        try {
            const enrollment = await db
                .select()
                .from(enrollments)
                .where(
                    and(
                        eq(enrollments.userId, userId),
                        eq(enrollments.courseId, Number(courseId)),
                        eq(enrollments.status, 'active')
                    )
                )
                .limit(1);

            if (!enrollment.length) {
                // Determine if we should allow it anyway (e.g. if studentProgress exists? No, strictly enrollments per report)
                // But let's check legacy support if needed. For now, strict check.
                return NextResponse.json(
                    { message: 'You are not enrolled in this course' },
                    { status: 403 }
                );
            }
        } catch (error: any) {
            logger.error('❌ Error checking enrollment:', error);
            // Fail open? Or closed? Closed is safer.
            return NextResponse.json(
                { message: 'Error verifying enrollment' },
                { status: 500 }
            );
        }

        // Use DataManager for chapter completion (with validation, transaction, dual-table sync, and events)
        const result = await markChapterComplete(
            userId,
            Number(courseId),
            Number(chapterId)
        );

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
        logger.error('Mark chapter complete error:', error);
        return NextResponse.json(
            { message: 'Failed to mark chapter complete', error: error.message },
            { status: 500 }
        );
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
