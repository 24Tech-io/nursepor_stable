import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateQBankSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET - Get single Q-Bank with question count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Get Q-Bank with question count
    const [qbank] = await db
      .select({
        id: questionBanks.id,
        name: questionBanks.name,
        description: questionBanks.description,
        courseId: questionBanks.courseId,
        status: questionBanks.status,
        isActive: questionBanks.isActive,
        createdAt: questionBanks.createdAt,
        updatedAt: questionBanks.updatedAt,
        questionCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${qbankQuestions}
          WHERE ${qbankQuestions.questionBankId} = ${questionBanks.id}
        )`,
      })
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Get questions for this Q-Bank
    const questions = await db
      .select({
        id: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
        subject: qbankQuestions.subject,
        // system: qbankQuestions.system, // REMOVED: does not exist
        // topic: qbankQuestions.topic, // REMOVED: does not exist
      })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId));

    return NextResponse.json({ qbank, questions });
  } catch (error: any) {
    logger.error('Get Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Q-Bank', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// PUT - Update Q-Bank
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateQBankSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const { title, description, isActive } = body as any;

    // Update Q-Bank
    const [updatedQBank] = await db
      .update(questionBanks)
      .set({
        name: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(questionBanks.id, qbankId))
      .returning();

    if (!updatedQBank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    return NextResponse.json({ qbank: updatedQBank });
  } catch (error: any) {
    logger.error('Update Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to update Q-Bank', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// DELETE - Delete Q-Bank
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Delete Q-Bank (cascade will delete all questions)
    await db
      .delete(questionBanks)
      .where(eq(questionBanks.id, qbankId));

    return NextResponse.json({ message: 'Q-Bank deleted successfully' });
  } catch (error: any) {
    logger.error('Delete Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to delete Q-Bank', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
