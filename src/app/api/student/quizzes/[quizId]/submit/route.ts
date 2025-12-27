import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizAttempts, chapters, quizzes, quizQuestions, modules, studentProgress } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth-helpers';
import { submitQuiz } from '@/lib/data-manager/helpers/progress-helper';
import { extractAndValidate, validateRouteParams } from '@/lib/api-validation';
import { submitQuizSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { getQuizQuestions, validateQuizAnswer } from '@/lib/quiz-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;

    // Validate route params
    const paramsValidation = validateRouteParams(
      z.object({ quizId: z.string().regex(/^\d+$/, 'Invalid quiz ID') }),
      params
    );
    if (!paramsValidation.success) {
      return paramsValidation.error;
    }
    const quizId = parseInt(params.quizId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, submitQuizSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { answers, timeTaken } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

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

    // Get all questions for this quiz from appropriate source
    const questions = await getQuizQuestions(quizId);

    if (!questions.length) {
      return NextResponse.json(
        { message: 'No questions found for this quiz' },
        { status: 404 }
      );
    }

    // Calculate score based on question source
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const totalQuestions = questions.length;
    const questionSource = quizData.questionSource || 'legacy';

    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const points = question.points || 1;
      totalPoints += points;

      const result = validateQuizAnswer(question, userAnswer, questionSource);
      if (result.isCorrect) {
        correctAnswers++;
        earnedPoints += result.pointsEarned;
      }
    });

    // Calculate score as percentage
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quizData.passMark;

    // Save quiz attempt
    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        userId,
        quizId: quizId,
        chapterId: quizData.chapterId,
        score,
        totalQuestions,
        correctAnswers,
        answers: JSON.stringify(answers),
        timeTaken,
        passed,
      })
      .returning();

    // Sync quiz attempt to studentProgress using DataManager
    try {
      // Get courseId from quiz (now directly available)
      const courseId = quizData.courseId;
      const chapterId = quizData.chapterId;

      if (courseId) {
        // Use DataManager for quiz submission (with validation, transaction, dual-table sync, and events)
        const result = await submitQuiz(
          userId,
          courseId,
          chapterId,
          quizId,
          score,
          passed
        );

        if (!result.success) {
          logger.error('❌ Error syncing quiz attempt:', result.error);
          // Don't fail the request - quiz attempt is saved, sync can be fixed later
        } else {
          logger.info(`✅ Quiz attempt synced to studentProgress for course ${courseId}. Progress: ${result.data?.progress}%`);
        }
      }
    } catch (error) {
      logger.error('❌ Error syncing quiz attempt to studentProgress:', error);
      // Don't fail the request - quiz attempt is saved, sync can be fixed later
    }

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
          questionType: q.questionType,
          isCorrect: validateQuizAnswer(q, answers[q.id], questionSource).isCorrect,
        }))
        : undefined,
    });
  } catch (error: any) {
    logger.error('Submit quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to submit quiz', error: error.message },
      { status: 500 }
    );
  }
}
