import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankQuestions, questionBanks, courses, courseQuestionAssignments } from '@/lib/db/schema';
import { desc, eq, count, sql } from 'drizzle-orm';
import { verifyToken, verifyAuth } from '@/lib/auth';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

// Safe JSON parser that handles both JSON strings and plain values
function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    // If it's not valid JSON, return as-is (e.g., single letter answers like 'b')
    return value;
  }
}

function getQuestionTypeLabel(type: string | null): string {
  if (!type) return 'Multiple Choice';
  const labels: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    sata: 'Select All That Apply',
    case_study: 'Case Study',
    bow_tie: 'Bow Tie',
    trend: 'Trend',
    matrix: 'Matrix',
    ordered_response: 'Ordered Response',
    calculation: 'Dosage Calculation',
    extended_drag_drop: 'Drag & Drop',
    highlight_text: 'Highlight Text',
    cloze: 'Cloze (Drop-Down)',
  };
  return labels[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    const db = await getDatabaseWithRetry();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const categoryId = url.searchParams.get('categoryId');
    const countOnly = url.searchParams.get('countOnly') === 'true';

    // If we just need count for dashboard, return early with optimized count query
    if (limit === 0 || countOnly) {
      const [result] = await db
        .select({ count: count() })
        .from(qbankQuestions);

      return NextResponse.json({
        questions: [],
        totalCount: Number(result?.count || 0),
      });
    }

    // Get total count for response
    const [countResult] = await db
      .select({ count: count() })
      .from(qbankQuestions);

    // Build query with optional category filter
    let query = db
      .select({
        id: qbankQuestions.id,
        categoryId: qbankQuestions.categoryId,
        questionType: qbankQuestions.questionType,
        question: qbankQuestions.question,
        explanation: qbankQuestions.explanation,
        points: qbankQuestions.points,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
        subject: qbankQuestions.subject,
        difficulty: qbankQuestions.difficulty,
        testType: qbankQuestions.testType,
      })
      .from(qbankQuestions)
      .$dynamic();

    // Apply category filter if provided
    if (categoryId) {
      query = query.where(eq(qbankQuestions.categoryId, parseInt(categoryId)));
    }

    // Add ordering by ID for consistent display
    const questions = await query.orderBy(qbankQuestions.id).limit(limit);

    return NextResponse.json({
      questions: questions.map((q: any) => ({
        id: q.id.toString(),
        categoryId: q.categoryId,
        stem: q.question
          ? q.question.substring(0, 100) + (q.question.length > 100 ? '...' : '')
          : 'No question text',
        category: q.testType || 'classic',
        label: getQuestionTypeLabel(q.questionType),
        format: q.questionType || 'multiple_choice',
        question: q.question,
        explanation: q.explanation,
        points: q.points,
        subject: q.subject,
        difficulty: q.difficulty,
        testType: q.testType,
        questionType: q.questionType,
        options: safeJsonParse(q.options, []),
        correctAnswer: safeJsonParse(q.correctAnswer, null),
        data: {
          options: safeJsonParse(q.options, []),
          correctAnswer: safeJsonParse(q.correctAnswer, null),
        },
      })),
      totalCount: Number(countResult?.count || 0),
    });
  } catch (error: any) {
    logger.error('Get Q-bank questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    const db = await getDatabaseWithRetry();
    const body = await request.json();

    logger.info('POST /api/qbank - Received data:', JSON.stringify(body, null, 2));

    // Support both single question and array of questions
    const questionsData = Array.isArray(body) ? body : [body];

    if (questionsData.length === 0) {
      return NextResponse.json({ message: 'At least one question is required' }, { status: 400 });
    }

    // Get or create a general Q-Bank (courseId can be null for standalone questions)
    let [qbank] = await db
      .select()
      .from(questionBanks)
      .where(sql`${questionBanks.courseId} IS NULL`)
      .limit(1);

    if (!qbank) {
      logger.info('Creating general Q-Bank...');
      [qbank] = await db
        .insert(questionBanks)
        .values({
          courseId: null,
          name: 'General Q-Bank',
        })
        .returning();
      logger.info('General Q-Bank created:', qbank.id);
    }

    // Insert questions
    logger.info('Inserting questions into Q-Bank:', qbank.id);
    const insertedQuestions = await db
      .insert(qbankQuestions)
      .values(
        questionsData.map((q: any) => ({
          questionBankId: qbank.id,
          questionType:
            q.type || q.questionType || q.format || q.questionFormat || 'multiple_choice',
          question: q.question || q.questionStem || '',
          explanation: q.explanation || q.rationale || null,
          imageUrl: q.imageUrl || q.image_url || null,
          points: q.points || 1,
          options: q.options
            ? typeof q.options === 'string'
              ? q.options
              : JSON.stringify(q.options)
            : '[]',
          correctAnswer: q.correctAnswer
            ? typeof q.correctAnswer === 'string'
              ? q.correctAnswer
              : JSON.stringify(q.correctAnswer)
            : '{}',
          subject: q.subject || null,
          lesson: q.lesson || null,
          clientNeedArea: q.clientNeedArea || null,
          subcategory: q.subcategory || null,
          testType: q.testType || 'mixed',
          difficulty: q.difficulty || 'medium',
        }))
      )
      .returning();

    logger.info('Questions inserted:', insertedQuestions.length);

    // AUTO-ASSIGN: Automatically assign these questions to ALL courses
    const allCourses = await db.select({ id: courses.id }).from(courses);

    if (allCourses.length > 0 && insertedQuestions.length > 0) {
      const assignments = [];
      for (const course of allCourses) {
        for (const question of insertedQuestions) {
          assignments.push({
            courseId: course.id,
            questionId: question.id,
            isModuleSpecific: false,
            sortOrder: 0,
          });
        }
      }

      // Batch insert all assignments
      if (assignments.length > 0) {
        await db.insert(courseQuestionAssignments)
          .values(assignments)
          .onConflictDoNothing();

        logger.info(`✅ Auto-assigned ${insertedQuestions.length} questions to ${allCourses.length} courses`);
      }
    }

    return NextResponse.json(
      {
        message: 'Questions created successfully',
        questions: insertedQuestions.map((q: any) => ({
          id: q.id.toString(),
          stem: q.question
            ? q.question.substring(0, 100) + (q.question.length > 100 ? '...' : '')
            : 'No question text',
          category: q.testType || 'classic',
          label: getQuestionTypeLabel(q.questionType),
          format: q.questionType,
          question: q.question,
          explanation: q.explanation,
          points: q.points,
          subject: q.subject,
          difficulty: q.difficulty,
          data: {
            options: safeJsonParse(q.options, []),
            correctAnswer: safeJsonParse(q.correctAnswer, null),
          },
        })),
        assignedToCourses: allCourses.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Create Q-bank questions error:', error);
    logger.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        message: 'Failed to create questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
