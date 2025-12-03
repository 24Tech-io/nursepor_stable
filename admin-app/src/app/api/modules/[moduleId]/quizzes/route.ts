import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { chapters, quizzes } from '@/lib/db/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { title, passMark, maxAttempts } = await request.json();
    const moduleId = parseInt(params.moduleId);

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Create the chapter (container for the quiz)
    const [chapter] = await db
      .insert(chapters)
      .values({
        moduleId,
        title,
        type: 'mcq',
        order: 999,
      })
      .returning();

    // Create the quiz
    const [quiz] = await db
      .insert(quizzes)
      .values({
        chapterId: chapter.id,
        title,
        passMark: passMark || 70,
        maxAttempts: maxAttempts || 3,
      })
      .returning();

    console.log(`✅ Quiz created: ${title} (Chapter ID: ${chapter.id}, Quiz ID: ${quiz.id})`);

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        title: chapter.title,
        type: chapter.type,
        order: chapter.order,
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passMark: quiz.passMark,
        maxAttempts: quiz.maxAttempts,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to create quiz', error: error.message },
      { status: 500 }
    );
  }
}
