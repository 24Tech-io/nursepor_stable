import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').optional(),
  explanation: z.string().optional().nullable(),
  questionType: z.string().optional(),
  testType: z.enum(['classic', 'ngn', 'mixed']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  subject: z.string().optional().nullable(),
  lesson: z.string().optional().nullable(),
  clientNeedArea: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  points: z.number().int().positive().optional(),
  options: z.string().optional(),
  correctAnswer: z.string().optional(),
});

// PUT - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    // Check authentication
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const qbankId = parseInt(params.id);
    const questionId = parseInt(params.questionId);

    if (isNaN(qbankId) || isNaN(questionId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID or Question ID' }, { status: 400 });
    }

    // Verify Q-Bank exists
    const [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Verify question exists and belongs to this Q-Bank
    const [existingQuestion] = await db
      .select()
      .from(qbankQuestions)
      .where(
        and(
          eq(qbankQuestions.id, questionId),
          eq(qbankQuestions.questionBankId, qbankId)
        )
      )
      .limit(1);

    if (!existingQuestion) {
      return NextResponse.json({ message: 'Question not found in this Q-Bank' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validation = updateQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (validation.data.question !== undefined) {
      updateData.question = validation.data.question;
    }
    if (validation.data.explanation !== undefined) {
      updateData.explanation = validation.data.explanation;
    }
    if (validation.data.questionType !== undefined) {
      updateData.questionType = validation.data.questionType;
    }
    if (validation.data.testType !== undefined) {
      updateData.testType = validation.data.testType;
    }
    if (validation.data.difficulty !== undefined) {
      updateData.difficulty = validation.data.difficulty;
    }
    if (validation.data.subject !== undefined) {
      updateData.subject = validation.data.subject;
    }
    if (validation.data.lesson !== undefined) {
      updateData.lesson = validation.data.lesson;
    }
    if (validation.data.clientNeedArea !== undefined) {
      updateData.clientNeedArea = validation.data.clientNeedArea;
    }
    if (validation.data.subcategory !== undefined) {
      updateData.subcategory = validation.data.subcategory;
    }
    if (validation.data.points !== undefined) {
      updateData.points = validation.data.points;
    }
    if (validation.data.options !== undefined) {
      updateData.options = validation.data.options;
    }
    if (validation.data.correctAnswer !== undefined) {
      updateData.correctAnswer = validation.data.correctAnswer;
    }

    // Update the question
    const [updatedQuestion] = await db
      .update(qbankQuestions)
      .set(updateData)
      .where(eq(qbankQuestions.id, questionId))
      .returning();

    return NextResponse.json({ question: updatedQuestion }, { status: 200 });
  } catch (error: any) {
    logger.error('Update question error:', error);
    return NextResponse.json(
      { message: 'Failed to update question', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// DELETE - Delete a question from a Q-Bank
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    // Check authentication
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const qbankId = parseInt(params.id);
    const questionId = parseInt(params.questionId);

    if (isNaN(qbankId) || isNaN(questionId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID or Question ID' }, { status: 400 });
    }

    // Verify Q-Bank exists
    const [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Verify question exists and belongs to this Q-Bank
    const [question] = await db
      .select()
      .from(qbankQuestions)
      .where(
        and(
          eq(qbankQuestions.id, questionId),
          eq(qbankQuestions.questionBankId, qbankId)
        )
      )
      .limit(1);

    if (!question) {
      return NextResponse.json({ message: 'Question not found in this Q-Bank' }, { status: 404 });
    }

    // Delete the question
    await db
      .delete(qbankQuestions)
      .where(eq(qbankQuestions.id, questionId));

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    logger.error('Delete question error:', error);
    return NextResponse.json(
      { message: 'Failed to delete question', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
