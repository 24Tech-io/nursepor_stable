import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes, quizQuestions, quizAttempts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getQuizQuestions, validateQuizAnswer } from '@/lib/quiz-helpers';

// GET - Fetch quiz details for student
export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const db = await getDatabaseWithRetry();

    // Get quiz
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quiz.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // Get questions from appropriate source
    const questions = await getQuizQuestions(quizId);

    // Get previous attempts (quizAttempts uses userId and quizId)
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, decoded.id),
          eq(quizAttempts.quizId, quizId)
        )
      )
      .orderBy(desc(quizAttempts.attemptedAt));

    return NextResponse.json({
      quiz: {
        ...quiz[0],
        questions: questions,
        previousAttempts: attempts,
      },
    });
  } catch (error: any) {
    logger.error('Get quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quiz', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit quiz attempt
export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const { answers } = await request.json(); // { questionId: answer }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ message: 'Answers are required' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Get quiz and questions
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quiz.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // Get questions from appropriate source
    const questions = await getQuizQuestions(quizId);
    const questionSource = quiz[0].questionSource === 'qbank' ? 'qbank' : 'legacy';

    // Check max attempts (quizAttempts uses userId and quizId)
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, decoded.id),
          eq(quizAttempts.quizId, quizId)
        )
      );

    if (quiz[0].maxAttempts && attempts.length >= quiz[0].maxAttempts) {
      return NextResponse.json(
        { message: `Maximum attempts (${quiz[0].maxAttempts}) reached` },
        { status: 400 }
      );
    }

    // Calculate score based on question source
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const results: any[] = [];

    questions.forEach((q) => {
      const studentAnswer = answers[q.id.toString()];
      const points = q.points || 1;
      totalPoints += points;

      const result = validateQuizAnswer(q, studentAnswer, questionSource);
      if (result.isCorrect) {
        correct++;
        earnedPoints += result.pointsEarned;
      }

      results.push({
        questionId: q.id,
        question: q.question,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: result.isCorrect,
        explanation: q.explanation,
        questionType: q.questionType,
      });
    });

    // Calculate score as percentage
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz[0].passMark;

    // Save attempt
    await db.insert(quizAttempts).values({
      userId: decoded.id,
      quizId: quizId,
      chapterId: quiz[0].chapterId,
      score: Math.round(score),
      totalQuestions: questions.length,
      correctAnswers: correct,
      answers: JSON.stringify(answers),
      timeTaken: 0, // Legacy route doesn't track time, set to 0
      passed,
    });

    return NextResponse.json({
      score,
      passed,
      correct,
      total: questions.length,
      passMark: quiz[0].passMark,
      results: quiz[0].showAnswers ? results : undefined, // Only return if showAnswers is true
    });
  } catch (error: any) {
    logger.error('Submit quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to submit quiz', error: error.message },
      { status: 500 }
    );
  }
}

