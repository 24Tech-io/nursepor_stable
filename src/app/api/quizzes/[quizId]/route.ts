import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes, quizQuestions, chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import { logger, securityLogger } from '@/lib/logger';

/**
 * GET /api/quizzes/[quizId]
 * Fetch quiz data with questions for editing
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { quizId: string } }
) {
    try {
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const quizId = parseInt(params.quizId);
        if (isNaN(quizId)) {
            return NextResponse.json({ message: 'Invalid quiz ID' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        logger.info(`Fetching quiz data for quiz ID ${quizId}`);

        // Fetch quiz
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

        if (!quiz || quiz.length === 0) {
            logger.warn(`Quiz ${quizId} not found in database`);
            return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
        }

        logger.info(`Quiz ${quizId} found, fetching questions...`);

        // Fetch custom questions
        const customQuestions = await db
            .select()
            .from(quizQuestions)
            .where(eq(quizQuestions.quizId, quizId));

        logger.info(`Found ${customQuestions.length} questions for quiz ${quizId}`);

        // Format questions for frontend
        const formattedQuestions = customQuestions.map(q => {
            // Safe JSON parse helper
            const safeParse = (val: any) => {
                if (!val) return [];
                if (typeof val === 'object') return val;
                try { return JSON.parse(val); } catch { return val; }
            };

            return {
                id: q.id.toString(),
                type: 'mcq',
                question: q.question,
                options: safeParse(q.options),
                correctAnswer: safeParse(q.correctAnswer),
                explanation: q.explanation || undefined,
            };
        });

        logger.info(`Successfully formatted ${formattedQuestions.length} questions for quiz ${quizId}`);

        return NextResponse.json({
            quiz: quiz[0],
            questions: formattedQuestions
        });

    } catch (error: any) {
        logger.error('Get quiz error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error?.message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/quizzes/[quizId]
 * Update quiz and questions
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { quizId: string } }
) {
    try {
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const quizId = parseInt(params.quizId);
        if (isNaN(quizId)) {
            return NextResponse.json({ message: 'Invalid quiz ID' }, { status: 400 });
        }

        const { title, passMark, maxAttempts, customQuestions } = await request.json();

        const db = await getDatabaseWithRetry();

        // Update quiz
        await db.update(quizzes)
            .set({
                title,
                passMark,
                maxAttempts,
            })
            .where(eq(quizzes.id, quizId));

        // Update chapter title too
        const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
        if (quiz && quiz[0].chapterId) {
            await db.update(chapters)
                .set({ title })
                .where(eq(chapters.id, quiz[0].chapterId));
        }

        // Delete old custom questions
        await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));

        // Insert new questions
        if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
            await db.insert(quizQuestions).values(
                customQuestions.map((q: any, index: number) => {
                    // Safe stringify helper - don't double-stringify
                    const safeStringify = (val: any) => {
                        if (typeof val === 'string') {
                            try {
                                JSON.parse(val);
                                return val; // Already JSON
                            } catch {
                                return JSON.stringify(val); // Plain string, stringify it
                            }
                        }
                        return JSON.stringify(val); // Object/array/number, stringify it
                    };

                    return {
                        quizId,
                        question: q.question,
                        options: safeStringify(q.options),
                        correctAnswer: safeStringify(q.correctAnswer),
                        explanation: q.explanation || null,
                        order: index,
                    };
                })
            );
        }

        securityLogger.info('Quiz Updated', { quizId, adminId: decoded.id });

        return NextResponse.json({
            message: 'Quiz updated successfully',
            questionCount: customQuestions?.length || 0
        });

    } catch (error: any) {
        logger.error('Update quiz error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error?.message },
            { status: 500 }
        );
    }
}
