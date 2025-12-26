import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { cloneQuestionSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST - Clone a question to a different folder
 * Creates a copy of the question with a new categoryId
 */
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

    // Validate request body
    const bodyValidation = await extractAndValidate(request, cloneQuestionSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { questionId, targetCategoryId } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // Fetch the original question
    const [originalQuestion] = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.id, questionId))
      .limit(1);

    if (!originalQuestion) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    // Create a clone with new categoryId
    const [clonedQuestion] = await db
      .insert(qbankQuestions)
      .values({
        questionBankId: originalQuestion.questionBankId,
        categoryId: targetCategoryId || null,
        questionType: originalQuestion.questionType,
        question: originalQuestion.question,
        explanation: originalQuestion.explanation,
        points: originalQuestion.points,
        options: originalQuestion.options,
        correctAnswer: originalQuestion.correctAnswer,
        subject: originalQuestion.subject,
        lesson: originalQuestion.lesson,
        clientNeedArea: originalQuestion.clientNeedArea,
        subcategory: originalQuestion.subcategory,
        testType: originalQuestion.testType,
        difficulty: originalQuestion.difficulty,
      })
      .returning();

    logger.info(`✅ Question ${questionId} cloned to category ${targetCategoryId || 'Uncategorized'} (New ID: ${clonedQuestion.id})`);

    return NextResponse.json({
      message: 'Question cloned successfully',
      originalId: questionId,
      clonedQuestion: {
        id: clonedQuestion.id,
        categoryId: clonedQuestion.categoryId,
      },
    });
  } catch (error: any) {
    logger.error('Clone question error:', error);
    return NextResponse.json(
      { message: 'Failed to clone question', error: error.message },
      { status: 500 }
    );
  }
}
