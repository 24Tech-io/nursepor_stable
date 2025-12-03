import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import {
  quizAttempts,
  chapters,
  quizzes,
  quizQuestions,
  modules,
  studentProgress,
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth-helpers';
import { submitQuiz } from '@/lib/data-manager/helpers/progress-helper';

export async function POST(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;
    const quizId = parseInt(params.quizId);

    if (isNaN(quizId)) {
      return NextResponse.json({ message: 'Invalid quiz ID' }, { status: 400 });
    }

    const { answers, timeTaken } = await request.json();

    if (!answers || typeof timeTaken !== 'number') {
      return NextResponse.json({ message: 'Answers and time taken are required' }, { status: 400 });
    }

    const db = getDatabase();

    // Get quiz details
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

    if (!quiz.length) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    const quizData = quiz[0];

    // Get all questions for this quiz
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    if (!questions.length) {
      return NextResponse.json({ message: 'No questions found for this quiz' }, { status: 404 });
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

    // Sync quiz attempt to studentProgress using DataManager
    try {
      // Get courseId from chapter
      const chapterResult = await db
        .select({ moduleId: chapters.moduleId })
        .from(chapters)
        .where(eq(chapters.id, quizData.chapterId))
        .limit(1);

      if (chapterResult.length > 0) {
        const moduleResult = await db
          .select({ courseId: modules.courseId })
          .from(modules)
          .where(eq(modules.id, chapterResult[0].moduleId))
          .limit(1);

        if (moduleResult.length > 0) {
          const courseId = moduleResult[0].courseId;

          // Use DataManager for quiz submission (with validation, transaction, dual-table sync, and events)
          const result = await submitQuiz(
            userId,
            courseId,
            quizData.chapterId,
            quizId,
            score,
            passed
          );

          if (!result.success) {
            console.error('❌ Error syncing quiz attempt:', result.error);
            // Don't fail the request - quiz attempt is saved, sync can be fixed later
          } else {
            console.log(
              `✅ Quiz attempt synced to studentProgress for course ${courseId}. Progress: ${result.data?.progress}%`
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Error syncing quiz attempt to studentProgress:', error);
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
