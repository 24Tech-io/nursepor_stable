import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * GET /api/chapters/[chapterId]/quiz
 * Get quiz ID for a chapter
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { chapterId: string } }
) {
    try {
        const chapterId = parseInt(params.chapterId);
        if (isNaN(chapterId)) {
            return NextResponse.json({ message: 'Invalid chapter ID' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        logger.info(`Looking up quiz for chapter ${chapterId}`);

        const quiz = await db
            .select({ id: quizzes.id })
            .from(quizzes)
            .where(eq(quizzes.chapterId, chapterId))
            .limit(1);

        logger.info(`Quiz lookup result for chapter ${chapterId}:`, { found: quiz.length > 0, quizId: quiz[0]?.id });

        if (!quiz || quiz.length === 0) {
            logger.warn(`No quiz found for chapter ${chapterId}`);
            return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
        }

        return NextResponse.json({ quizId: quiz[0].id });

    } catch (error: any) {
        logger.error('Get quiz ID error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error?.message },
            { status: 500 }
        );
    }
}
