import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { qbankMarkedQuestions, qbankQuestions, questionBanks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST - Mark a question for review
export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const questionId = parseInt(params.questionId);
    const body = await request.json();
    const { notes } = body;

    // Get question to find question bank ID
    const [question] = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    // Check if already marked
    const existing = await db
      .select()
      .from(qbankMarkedQuestions)
      .where(
        and(
          eq(qbankMarkedQuestions.userId, user.id),
          eq(qbankMarkedQuestions.questionId, questionId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update notes if provided
      if (notes !== undefined) {
        await db
          .update(qbankMarkedQuestions)
          .set({ notes })
          .where(eq(qbankMarkedQuestions.id, existing[0].id));
      }
      return NextResponse.json({ 
        message: 'Question already marked', 
        marked: true 
      });
    }

    // Insert new marked question
    await db.insert(qbankMarkedQuestions).values({
      userId: user.id,
      questionId,
      questionBankId: question.questionBankId,
      notes: notes || null,
    });

    return NextResponse.json({ 
      message: 'Question marked for review', 
      marked: true 
    });
  } catch (error: any) {
    console.error('Mark question error:', error);
    return NextResponse.json(
      { message: 'Failed to mark question', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unmark a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const questionId = parseInt(params.questionId);

    await db
      .delete(qbankMarkedQuestions)
      .where(
        and(
          eq(qbankMarkedQuestions.userId, user.id),
          eq(qbankMarkedQuestions.questionId, questionId)
        )
      );

    return NextResponse.json({ 
      message: 'Question unmarked', 
      marked: false 
    });
  } catch (error: any) {
    console.error('Unmark question error:', error);
    return NextResponse.json(
      { message: 'Failed to unmark question', error: error.message },
      { status: 500 }
    );
  }
}

