import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizzes, quizQuestions, quizQbankQuestions, qbankQuestions } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

// GET - Fetch quizzes for a chapter
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value ||
      request.cookies.get('adminToken')?.value ||
      request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const courseId = searchParams.get('courseId');

    const db = await getDatabaseWithRetry();

    // Build query based on provided filters
    let chapterQuizzes;

    if (chapterId) {
      chapterQuizzes = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.chapterId, parseInt(chapterId)));
    } else if (courseId) {
      chapterQuizzes = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.courseId, parseInt(courseId)));
    } else {
      return NextResponse.json({ message: 'Chapter ID or Course ID is required' }, { status: 400 });
    }

    // For each quiz, fetch its questions based on questionSource
    const quizzesWithQuestions = await Promise.all(
      chapterQuizzes.map(async (quiz) => {
        let questions: any[] = [];

        if (quiz.questionSource === 'qbank') {
          // Fetch Q-Bank questions
          const questionLinks = await db
            .select({
              questionId: quizQbankQuestions.questionId,
              sortOrder: quizQbankQuestions.sortOrder,
            })
            .from(quizQbankQuestions)
            .where(eq(quizQbankQuestions.quizId, quiz.id))
            .orderBy(quizQbankQuestions.sortOrder);

          if (questionLinks.length > 0) {
            const questionIds = questionLinks.map(link => link.questionId);
            const qbankQuestionsData = await db
              .select()
              .from(qbankQuestions)
              .where(inArray(qbankQuestions.id, questionIds));

            const questionMap = new Map(qbankQuestionsData.map(q => [q.id, q]));

            questions = questionLinks
              .map(link => {
                const q = questionMap.get(link.questionId);
                if (!q) return null;
                return {
                  ...q,
                  order: link.sortOrder,
                };
              })
              .filter(Boolean) as any[];
          }
        } else {
          // Fetch legacy questions
          questions = await db
            .select()
            .from(quizQuestions)
            .where(eq(quizQuestions.quizId, quiz.id))
            .orderBy(quizQuestions.order);
        }

        return {
          ...quiz,
          questions,
        };
      })
    );

    return NextResponse.json({ quizzes: quizzesWithQuestions });
  } catch (error: any) {
    logger.error('Get quizzes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quizzes', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new quiz
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value ||
      request.cookies.get('adminToken')?.value ||
      request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const {
      courseId,
      chapterId,
      title,
      passMark,
      timeLimit,
      showAnswers,
      maxAttempts,
      questionSource,
      questions,
      questionIds,
    } = await request.json();

    if (!courseId || !title) {
      return NextResponse.json(
        { message: 'Course ID and title are required' },
        { status: 400 }
      );
    }

    const db = await getDatabaseWithRetry();

    // Determine question source
    const source = questionSource || 'legacy';

    // Validate questions based on source
    if (source === 'qbank') {
      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json(
          { message: 'Question IDs are required when using Q-Bank source' },
          { status: 400 }
        );
      }
    } else {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { message: 'Questions are required when using legacy source' },
          { status: 400 }
        );
      }
    }

    // Create quiz
    const quiz = await db.insert(quizzes).values({
      courseId: parseInt(courseId),
      chapterId: chapterId ? parseInt(chapterId) : null,
      title,
      passMark: passMark || 70,
      timeLimit: timeLimit || null,
      showAnswers: showAnswers !== false,
      maxAttempts: maxAttempts || 3,
      isPublished: true,
      questionSource: source,
    }).returning();

    // Create questions based on source
    if (source === 'qbank') {
      // Link Q-Bank questions to quiz
      await db.insert(quizQbankQuestions).values(
        questionIds.map((qId: number, index: number) => ({
          quizId: quiz[0].id,
          questionId: qId,
          sortOrder: index,
        }))
      );
    } else {
      // Create legacy questions
      await Promise.all(
        questions.map((q: any, index: number) =>
          db.insert(quizQuestions).values({
            quizId: quiz[0].id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            order: index,
          })
        )
      );
    }

    logger.info('✅ Quiz created with questions:', quiz[0]);

    return NextResponse.json({ quiz: quiz[0] });
  } catch (error: any) {
    logger.error('Create quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to create quiz', error: error.message },
      { status: 500 }
    );
  }
}

