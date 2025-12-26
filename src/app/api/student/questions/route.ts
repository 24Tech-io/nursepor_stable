import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  qbankQuestions,
  questionBanks,
  qbankQuestionAttempts,
  qbankEnrollments
} from '@/lib/db/schema';
import { eq, and, inArray, isNull, or, sql } from 'drizzle-orm';

function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const studentId = decoded.id;
    const { searchParams } = new URL(request.url);
    const qbankId = parseInt(searchParams.get('qbankId') || '0');

    if (!qbankId || isNaN(qbankId)) {
      return NextResponse.json({ message: 'Q-Bank ID is required' }, { status: 400 });
    }

    // Verify enrollment
    const [enrollment] = await db
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, studentId),
          eq(qbankEnrollments.qbankId, qbankId)
        )
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ message: 'Not enrolled in this Q-Bank' }, { status: 403 });
    }

    // Get filter parameters
    const subjects = searchParams.getAll('subjects[]');
    const systems = searchParams.getAll('systems[]');
    const status = searchParams.get('status'); // 'unused' | 'incorrect' | 'marked' | 'all'
    const testType = searchParams.get('testType'); // 'classic' | 'ngn' | 'mixed'
    const questionType = searchParams.get('questionType'); // specific question type

    // Build where conditions
    const whereConditions: any[] = [eq(qbankQuestions.questionBankId, qbankId)];

    // Apply subject filter (multi-select)
    if (subjects.length > 0) {
      whereConditions.push(inArray(qbankQuestions.subject, subjects));
    }

    // Apply system/lesson filter (multi-select)
    if (systems.length > 0) {
      whereConditions.push(inArray(qbankQuestions.lesson, systems));
    }

    // Apply test type filter
    if (testType && testType !== 'mixed') {
      whereConditions.push(eq(qbankQuestions.testType, testType));
    }

    // Apply question type filter
    if (questionType && questionType !== 'all') {
      whereConditions.push(eq(qbankQuestions.questionType, questionType));
    }

    // Get all questions first
    let questions = await db
      .select({
        id: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
        explanation: qbankQuestions.explanation,
        subject: qbankQuestions.subject,
        lesson: qbankQuestions.lesson,
        clientNeedArea: qbankQuestions.clientNeedArea,
        subcategory: qbankQuestions.subcategory,
        testType: qbankQuestions.testType,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
      })
      .from(qbankQuestions)
      .where(and(...whereConditions));

    // Apply status filter based on attempt history
    if (status && status !== 'all') {
      // Get all question attempts for this student and Q-Bank
      const attempts = await db
        .select({
          questionId: qbankQuestionAttempts.questionId,
          isCorrect: qbankQuestionAttempts.isCorrect,
          markedForReview: qbankQuestionAttempts.markedForReview,
        })
        .from(qbankQuestionAttempts)
        .innerJoin(
          qbankQuestions,
          eq(qbankQuestionAttempts.questionId, qbankQuestions.id)
        )
        .where(
          and(
            eq(qbankQuestionAttempts.userId, studentId),
            eq(qbankQuestions.questionBankId, qbankId)
          )
        );

      const attemptMap = new Map();
      attempts.forEach(attempt => {
        attemptMap.set(attempt.questionId, attempt);
      });

      if (status === 'unused') {
        // Questions never attempted
        questions = questions.filter(q => !attemptMap.has(q.id));
      } else if (status === 'incorrect') {
        // Questions answered incorrectly
        questions = questions.filter(q => {
          const attempt = attemptMap.get(q.id);
          return attempt && !attempt.isCorrect;
        });
      } else if (status === 'marked') {
        // Questions marked for review
        questions = questions.filter(q => {
          const attempt = attemptMap.get(q.id);
          return attempt && attempt.markedForReview;
        });
      }
    }

    // Format questions for frontend
    const formattedQuestions = questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType,
      options: safeJsonParse(q.options, []),
      correctAnswer: safeJsonParse(q.correctAnswer, null),
      explanation: q.explanation,
      subject: q.subject,
      lesson: q.lesson,
      clientNeedArea: q.clientNeedArea,
      subcategory: q.subcategory,
      testType: q.testType,
      difficulty: q.difficulty,
      points: q.points,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      total: formattedQuestions.length,
    });
  } catch (error: any) {
    logger.error('Get student questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

