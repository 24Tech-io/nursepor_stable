import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { quizzes, quizQuestions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch quizzes for a chapter
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ message: 'Chapter ID is required' }, { status: 400 });
    }

    const db = getDatabase();

    const chapterQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.chapterId, parseInt(chapterId)));

    // For each quiz, fetch its questions
    const quizzesWithQuestions = await Promise.all(
      chapterQuizzes.map(async (quiz: any) => {
        const questions = await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quiz.id))
          .orderBy(quizQuestions.order);

        return {
          ...quiz,
          questions,
        };
      })
    );

    return NextResponse.json({ quizzes: quizzesWithQuestions });
  } catch (error: any) {
    console.error('Get quizzes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quizzes', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new quiz
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const {
      chapterId,
      title,
      passMark,
      timeLimit,
      showAnswers,
      maxAttempts,
      questions,
    } = await request.json();

    if (!chapterId || !title || !questions || questions.length === 0) {
      return NextResponse.json(
        { message: 'Chapter ID, title, and questions are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Create quiz
    const quiz = await db.insert(quizzes).values({
      chapterId: parseInt(chapterId),
      title,
      passMark: passMark || 70,
      timeLimit: timeLimit || null,
      showAnswers: showAnswers !== false,
      maxAttempts: maxAttempts || 3,
      isPublished: true,
    }).returning();

    // Create questions
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

    console.log('✅ Quiz created with questions:', quiz[0]);

    return NextResponse.json({ quiz: quiz[0] });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to create quiz', error: error.message },
      { status: 500 }
    );
  }
}

