import { logger, securityLogger } from '@/lib/logger';
import { NextResponse, NextRequest } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes, chapters, modules, qbankQuestions, quizQbankQuestions, quizQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/modules/[moduleId]/quizzes
 * Create a new quiz and attach it to a chapter in the specified module
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        // Check authentication
        const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const moduleId = parseInt(params.moduleId);
        const body = await request.json();
        const { title, passMark, maxAttempts, sourceQBankId, customQuestions } = body;

        // Get database instance
        const db = await getDatabaseWithRetry();

        if (isNaN(moduleId) || moduleId <= 0) {
            return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
        }

        // Validate required fields
        if (!title) {
            return NextResponse.json(
                { message: 'Quiz title is required' },
                { status: 400 }
            );
        }

        // Verify module exists and get its courseId
        const moduleData = await db
            .select()
            .from(modules)
            .where(eq(modules.id, moduleId))
            .limit(1);

        if (!moduleData || moduleData.length === 0) {
            return NextResponse.json(
                { message: 'Module not found' },
                { status: 404 }
            );
        }

        const courseId = moduleData[0].courseId;

        const { newChapter, newQuiz, importedCount } = await db.transaction(async (tx: any) => {
            // Get current chapter count for ordering
            const existingChapters = await tx
                .select()
                .from(chapters)
                .where(eq(chapters.moduleId, moduleId));
            const order = existingChapters.length;

            // Create a new chapter of type 'mcq' or 'quiz'
            const newChapter = await tx
                .insert(chapters)
                .values({
                    moduleId,
                    title,
                    type: 'mcq',
                    order,
                    isPublished: true,
                })
                .returning();

            // Create the quiz linked to the new chapter
            const newQuiz = await tx
                .insert(quizzes)
                .values({
                    courseId,
                    chapterId: newChapter[0].id,
                    title,
                    passMark: passMark || 70,
                    maxAttempts: maxAttempts || 3,
                    questionSource: sourceQBankId ? 'qbank' : 'custom',
                    isPublished: true,
                })
                .returning();

            // Import questions from Q-Bank if selected (with proper type validation)
            let importedCount = 0;
            const qbankId = typeof sourceQBankId === 'number' ? sourceQBankId :
                (typeof sourceQBankId === 'string' ? parseInt(sourceQBankId) : null);

            if (qbankId && !isNaN(qbankId)) {
                const questionsToImport = await tx
                    .select()
                    .from(qbankQuestions)
                    .where(eq(qbankQuestions.questionBankId, qbankId));

                if (questionsToImport.length > 0) {
                    const quizQuestionsData = questionsToImport.map((q, idx) => ({
                        quizId: newQuiz[0].id,
                        questionId: q.id,
                        sortOrder: idx,
                    }));

                    await tx.insert(quizQbankQuestions).values(quizQuestionsData);
                    importedCount = quizQuestionsData.length;
                }
            }
            // Save custom questions
            else if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
                await tx.insert(quizQuestions).values(
                    customQuestions.map((q: any, index: number) => {
                        // Safe stringify helper - don't double-stringify
                        const safeStringify = (val: any) => {
                            if (typeof val === 'string') {
                                // If it's already a string, check if it's valid JSON
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
                            quizId: newQuiz[0].id,
                            question: q.question,
                            options: safeStringify(q.options),
                            correctAnswer: safeStringify(q.correctAnswer),
                            explanation: q.explanation || null,
                            order: index,
                        };
                    })
                );
                importedCount = customQuestions.length;
            }

            return {
                newChapter: newChapter[0],
                newQuiz: newQuiz[0],
                importedCount,
            };
        });

        securityLogger.info('Quiz Created', {
            quizId: newQuiz.id,
            chapterId: newChapter.id,
            moduleId,
            courseId,
            importedCount,
        });

        return NextResponse.json({
            message: 'Quiz created successfully',
            quiz: newQuiz,
            chapter: newChapter,
            importedCount,
        });
    } catch (error: any) {
        // Enhanced error logging to diagnose database issues
        logger.error('Create quiz error:', {
            message: error?.message,
            code: error?.code,
            detail: error?.detail,
            hint: error?.hint,
            stack: error?.stack
        });

        // Check for specific database errors
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
            return NextResponse.json(
                {
                    message: 'Database table or column does not exist. Please run: npx drizzle-kit push',
                    error: error?.message,
                    code: error?.code,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }

        if (error?.code === '42703' || error?.message?.includes('column')) {
            return NextResponse.json(
                {
                    message: 'Database schema mismatch. Please run: npx drizzle-kit push',
                    error: error?.message,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: 'Internal server error',
                error: error?.message || 'Unknown error',
                code: error?.code,
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error?.stack,
                    detail: error?.detail,
                    hint: error?.hint
                } : undefined
            },
            { status: 500 }
        );
    }
}
