import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { assignQuizQuestionsSchema, removeQuizQuestionsSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { quizQbankQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Add Q-Bank questions to quiz
export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, assignQuizQuestionsSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { questionIds } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // Insert question assignments
    const assignments = questionIds.map((questionId: number, index: number) => ({
      quizId,
      questionId,
      sortOrder: index,
    }));

    const inserted = await db
      .insert(quizQbankQuestions)
      .values(assignments)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({
      message: `${inserted.length} questions added to quiz`,
      assignments: inserted,
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Add quiz questions error:', error);
    return NextResponse.json(
      { message: 'Failed to add questions', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove question from quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, removeQuizQuestionsSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { questionIds } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    if (questionIds && Array.isArray(questionIds)) {
      // Delete specific questions
      await db
        .delete(quizQbankQuestions)
        .where(
          eq(quizQbankQuestions.quizId, quizId)
        );
    } else {
      // Delete all questions from quiz
      await db
        .delete(quizQbankQuestions)
        .where(eq(quizQbankQuestions.quizId, quizId));
    }

    return NextResponse.json({ message: 'Questions removed successfully' });
  } catch (error: any) {
    logger.error('Remove quiz questions error:', error);
    return NextResponse.json(
      { message: 'Failed to remove questions', error: error.message },
      { status: 500 }
    );
  }
}

