import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { quizzes, quizQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch quiz with questions (for admin editing)
export async function GET(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const db = getDatabase();

    // Get quiz
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

    if (quiz.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // Get questions
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    return NextResponse.json({
      quiz: {
        ...quiz[0],
        questions,
      },
    });
  } catch (error: any) {
    console.error('Get quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quiz', error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update quiz metadata
export async function PATCH(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const { title, passMark, maxAttempts, timeLimit, showAnswers } = await request.json();

    const db = getDatabase();

    const updated = await db
      .update(quizzes)
      .set({
        title: title || undefined,
        passMark: passMark !== undefined ? passMark : undefined,
        maxAttempts: maxAttempts !== undefined ? maxAttempts : undefined,
        timeLimit: timeLimit !== undefined ? timeLimit : undefined,
        showAnswers: showAnswers !== undefined ? showAnswers : undefined,
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    console.log(`✅ Quiz ${quizId} updated:`, updated[0]);

    return NextResponse.json({
      message: 'Quiz updated successfully',
      quiz: updated[0],
    });
  } catch (error: any) {
    console.error('Update quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to update quiz', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete quiz
export async function DELETE(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const db = getDatabase();

    // Delete quiz (cascade will delete questions)
    await db.delete(quizzes).where(eq(quizzes.id, quizId));

    console.log(`✅ Quiz ${quizId} deleted`);

    return NextResponse.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to delete quiz', error: error.message },
      { status: 500 }
    );
  }
}




