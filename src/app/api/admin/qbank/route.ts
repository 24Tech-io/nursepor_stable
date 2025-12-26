import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createQuestionSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

// Get human-readable label for question type
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: 'Single Best Answer',
    sata: 'SATA (Classic)',
    ngn_case_study: 'Case Study',
    unfolding_ngn: 'Unfolding NGN',
    bowtie: 'Bow-Tie',
    casestudy: 'Case Study',
    matrix: 'Matrix',
    trend: 'Trend',
    standard: 'Single Best Answer',
    sata_classic: 'SATA (Classic)',
  };
  return labels[type] || type;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const categoryId = url.searchParams.get('categoryId');

    // If we just need count for dashboard, return early with optimized count query
    if (limit === 0 || url.searchParams.get('countOnly') === 'true') {
      const [result] = await db
        .select({ count: sql<number>`COUNT(${qbankQuestions.id})` })
        .from(qbankQuestions)
        .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id));

      return NextResponse.json({
        questions: [],
        totalCount: Number(result?.count || 0),
      });
    }

    // Get total count for response
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(${qbankQuestions.id})` })
      .from(qbankQuestions)
      .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id));

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
      .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id))
      .$dynamic();

    // Apply category filter if provided
    if (categoryId) {
      query = query.where(eq(qbankQuestions.categoryId, parseInt(categoryId)));
    }

    // ✅ FIX: Add ordering by ID for consistent display
    const questions = await query.orderBy(qbankQuestions.id).limit(limit);

    return NextResponse.json({
      questions: questions.map((q: any) => ({
        id: q.id.toString(),
        categoryId: q.categoryId, // ✅ FIXED: Include categoryId for folder display
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
        questionType: q.questionType, // ✅ Add for cloning
        options: safeJsonParse(q.options, []), // ✅ Flatten for easier access
        correctAnswer: safeJsonParse(q.correctAnswer, null), // ✅ Flatten for easier access
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
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    // Support both single question and array of questions
    const rawBody = await request.json();
    const questionsData = Array.isArray(rawBody) ? rawBody : [rawBody];

    if (questionsData.length === 0) {
      return NextResponse.json({ message: 'At least one question is required' }, { status: 400 });
    }

    // Validate each question
    for (let i = 0; i < questionsData.length; i++) {
      const questionValidation = createQuestionSchema.safeParse(questionsData[i]);
      if (!questionValidation.success) {
        return NextResponse.json(
          {
            message: `Validation failed for question ${i + 1}`,
            errors: questionValidation.error.issues
          },
          { status: 400 }
        );
      }
      questionsData[i] = questionValidation.data;
    }

    logger.info('POST /api/qbank - Received data:', JSON.stringify(questionsData, null, 2));

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

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, z.object({
      questionId: z.number().int().positive('Question ID must be positive'),
      categoryId: z.number().int().positive().optional().nullable(),
    }));
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { questionId, categoryId } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // ✅ FIXED: Properly handle categoryId updates (including null)
    const updateData: any = { updatedAt: new Date() };

    if ('categoryId' in bodyValidation.data) {
      updateData.categoryId = categoryId; // Can be null, number, or undefined
    }

    const [updatedQuestion] = await db
      .update(qbankQuestions)
      .set(updateData)
      .where(eq(qbankQuestions.id, questionId))
      .returning();

    if (!updatedQuestion) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    logger.info(`✅ Question ${questionId} updated: categoryId = ${categoryId}`);

    return NextResponse.json({
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error: any) {
    logger.error('Update question error:', error);
    return NextResponse.json(
      { message: 'Failed to update question', error: error.message },
      { status: 500 }
    );
  }
}
