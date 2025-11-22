import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { quizAttempts, chapters, quizzes, quizQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth-helpers';

export async function POST(
    request: NextRequest,
    { params }: { params: { quizId: string } }
) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = authResult.user.id;
        const quizId = parseInt(params.quizId);

        if (isNaN(quizId)) {
            return NextResponse.json(
                { message: 'Invalid quiz ID' },
                { status: 400 }
            );
        }

        const { answers, timeTaken } = await request.json();

        if (!answers || typeof timeTaken !== 'number') {
            return NextResponse.json(
                { message: 'Answers and time taken are required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Get quiz details
        const quiz = await db
            .select()
            .from(quizzes)
            .where(eq(quizzes.id, quizId))
            .limit(1);

        if (!quiz.length) {
            return NextResponse.json(
                { message: 'Quiz not found' },
                { status: 404 }
            );
        }

        const quizData = quiz[0];

        // Get all questions for this quiz
        const questions = await db
            .select()
            .from(quizQuestions)
            .where(eq(quizQuestions.quizId, quizId))
            .orderBy(quizQuestions.order);

        if (!questions.length) {
            return NextResponse.json(
                { message: 'No questions found for this quiz' },
                { status: 404 }
            );
        }

        // Calculate score
        let correctAnswers = 0;
        const totalQuestions = questions.length;

        questions.forEach((question) => {
            const userAnswer = answers[question.id];
            if (userAnswer === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        const passed = score >= quizData.passMark;

        // Save quiz attempt
        const [attempt] = await db
            .insert(quizAttempts)
            .values({
                userId,
                chapterId: quizData.chapterId,
                score,
                totalQuestions,
                correctAnswers,
                answers: JSON.stringify(answers),
                timeTaken,
                passed,
            })
            .returning();

        return NextResponse.json({
            message: passed ? 'Quiz passed!' : 'Quiz failed. Try again.',
            attempt: {
                id: attempt.id,
                score,
                totalQuestions,
                correctAnswers,
                passed,
                passMark: quizData.passMark,
                timeTaken,
            },
            showAnswers: quizData.showAnswers,
            questions: quizData.showAnswers
                ? questions.map((q) => ({
                    id: q.id,
                    question: q.question,
                    correctAnswer: q.correctAnswer,
                    userAnswer: answers[q.id],
                    explanation: q.explanation,
                }))
                : undefined,
        });
    } catch (error: any) {
        console.error('Submit quiz error:', error);
        return NextResponse.json(
            { message: 'Failed to submit quiz', error: error.message },
            { status: 500 }
        );
    }
}
