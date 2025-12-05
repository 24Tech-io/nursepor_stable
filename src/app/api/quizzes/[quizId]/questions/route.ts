import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { quizQbankQuestions, quizQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Add questions to quiz (supports both regular questions and Q-Bank references)
export async function POST(request: NextRequest, { params }: { params: { quizId: string } }) {
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
    const body = await request.json();

    const db = getDatabase();

    // Check if this is Q-Bank question IDs or regular question data
    if (body.questionIds && Array.isArray(body.questionIds)) {
      // Q-Bank questions - link existing questions
      const assignments = body.questionIds.map((questionId: number, index: number) => ({
        quizId,
        questionId,
        sortOrder: index,
      }));

      const inserted = await db
        .insert(quizQbankQuestions)
        .values(assignments)
        .onConflictDoNothing()
        .returning();

      return NextResponse.json(
        {
          message: `${inserted.length} Q-Bank questions added to quiz`,
          assignments: inserted,
        },
        { status: 201 }
      );
    } else {
      // Regular quiz question - create new question
      const { question, options, correctAnswer, explanation, order } = body;

      if (!question) {
        return NextResponse.json({ message: 'Question text is required' }, { status: 400 });
      }

      // Normalize correctAnswer - store as plain string (index)
      let normalizedCorrectAnswer = correctAnswer;
      if (typeof correctAnswer !== 'string') {
        normalizedCorrectAnswer = String(correctAnswer);
      }
      // Remove extra quotes if present
      normalizedCorrectAnswer = normalizedCorrectAnswer.replace(/^["']|["']$/g, '');
      
      const inserted = await db
        .insert(quizQuestions)
        .values({
          quizId,
          question,
          options: typeof options === 'string' ? options : JSON.stringify(options || []),
          correctAnswer: normalizedCorrectAnswer, // Store as plain string
          explanation: explanation || '',
          order: order || 0,
        })
        .returning();
      
      console.log(`✅ Saved question with correctAnswer: "${normalizedCorrectAnswer}" (type: ${typeof normalizedCorrectAnswer})`);

      console.log(`✅ Added regular question to quiz ${quizId}:`, inserted[0].id);

      return NextResponse.json(
        {
          message: 'Question added to quiz',
          question: inserted[0],
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Add quiz questions error:', error);
    return NextResponse.json(
      { message: 'Failed to add questions', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove all questions from quiz
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

    // Delete all regular questions
    const deletedRegular = await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId)).returning();

    // Delete all Q-Bank question links
    const deletedQBank = await db.delete(quizQbankQuestions).where(eq(quizQbankQuestions.quizId, quizId)).returning();

    console.log(`✅ All questions removed from quiz ${quizId}`);

    return NextResponse.json({ message: 'All questions removed successfully' });
  } catch (error: any) {
    console.error('Remove quiz questions error:', error);
    return NextResponse.json(
      { message: 'Failed to remove questions', error: error.message },
      { status: 500 }
    );
  }
}
