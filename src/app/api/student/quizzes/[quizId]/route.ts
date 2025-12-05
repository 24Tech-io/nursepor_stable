import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { quizzes, quizQuestions, quizAttempts, quizQbankQuestions, qbankQuestions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch quiz details for student
export async function GET(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const token = request.cookies.get('studentToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const db = getDatabase();

    // Get quiz
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

    if (quiz.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // ✅ FIX: Get questions from BOTH regular quiz_questions AND Q-Bank
    let questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    // If no regular questions, try Q-Bank questions
    if (questions.length === 0) {
      console.log(`📚 No regular questions found for quiz ${quizId}, checking Q-Bank...`);
      const qbankLinks = await db
        .select({
          id: qbankQuestions.id,
          quizId: quizQbankQuestions.quizId,
          question: qbankQuestions.question,
          options: qbankQuestions.options,
          correctAnswer: qbankQuestions.correctAnswer,
          explanation: qbankQuestions.explanation,
          order: quizQbankQuestions.sortOrder,
        })
        .from(quizQbankQuestions)
        .innerJoin(qbankQuestions, eq(quizQbankQuestions.questionId, qbankQuestions.id))
        .where(eq(quizQbankQuestions.quizId, quizId))
        .orderBy(quizQbankQuestions.sortOrder);

      console.log(`📚 Found ${qbankLinks.length} Q-Bank questions for quiz ${quizId}`);
      questions = qbankLinks as any;
    } else {
      console.log(`📝 Found ${questions.length} regular questions for quiz ${quizId}`);
    }

    // Get previous attempts (quizAttempts uses userId and chapterId, not studentId and quizId)
    const chapterId = quiz[0].chapterId;
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, decoded.id), eq(quizAttempts.chapterId, chapterId)))
      .orderBy(desc(quizAttempts.attemptedAt));

    // Parse question options and normalize correctAnswer
    const questionsWithOptions = questions.map((q) => {
      const options = JSON.parse(q.options || '{}');
      let correctAnswer = q.correctAnswer;
      
      // Normalize correctAnswer - remove any JSON wrapping
      if (typeof correctAnswer === 'string') {
        // Remove quotes if present (e.g., "\"1\"" becomes "1")
        correctAnswer = correctAnswer.replace(/^["']+|["']+$/g, '');
        // Try to parse if it's wrapped in JSON
        try {
          const parsed = JSON.parse(correctAnswer);
          if (typeof parsed === 'string') {
            correctAnswer = parsed;
          }
        } catch (e) {
          // Not JSON, use as-is
        }
      }
      
      console.log(`📝 Question ${q.id}: correctAnswer="${correctAnswer}" (type: ${typeof correctAnswer})`);
      
      return {
        ...q,
        options,
        correctAnswer,
      };
    });

    return NextResponse.json({
      quiz: {
        ...quiz[0],
        questions: questionsWithOptions,
        previousAttempts: attempts,
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

// POST - Submit quiz attempt
export async function POST(request: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const token = request.cookies.get('studentToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const quizId = parseInt(params.quizId);
    const { answers } = await request.json(); // { questionId: answer }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ message: 'Answers are required' }, { status: 400 });
    }

    const db = getDatabase();

    // Get quiz and questions
    const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);

    if (quiz.length === 0) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // ✅ FIX: Get questions from BOTH regular quiz_questions AND Q-Bank
    let questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    // If no regular questions, try Q-Bank questions
    if (questions.length === 0) {
      const qbankLinks = await db
        .select({
          id: qbankQuestions.id,
          quizId: quizQbankQuestions.quizId,
          question: qbankQuestions.question,
          options: qbankQuestions.options,
          correctAnswer: qbankQuestions.correctAnswer,
          explanation: qbankQuestions.explanation,
          order: quizQbankQuestions.sortOrder,
        })
        .from(quizQbankQuestions)
        .innerJoin(qbankQuestions, eq(quizQbankQuestions.questionId, qbankQuestions.id))
        .where(eq(quizQbankQuestions.quizId, quizId))
        .orderBy(quizQbankQuestions.sortOrder);

      questions = qbankLinks as any;
    }

    // Check max attempts (quizAttempts uses userId and chapterId)
    const chapterId = quiz[0].chapterId;
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, decoded.id), eq(quizAttempts.chapterId, chapterId)));

    if (quiz[0].maxAttempts && attempts.length >= quiz[0].maxAttempts) {
      return NextResponse.json(
        { message: `Maximum attempts (${quiz[0].maxAttempts}) reached` },
        { status: 400 }
      );
    }

    // Calculate score
    let correct = 0;
    const results: any[] = [];

    questions.forEach((q) => {
      const studentAnswer = answers[q.id.toString()];
      const isCorrect = studentAnswer === q.correctAnswer;
      if (isCorrect) correct++;

      results.push({
        questionId: q.id,
        question: q.question,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      });
    });

    const score = (correct / questions.length) * 100;
    const passed = score >= quiz[0].passMark;

    // Save attempt
    await db.insert(quizAttempts).values({
      studentId: decoded.id,
      quizId,
      score,
      passed,
      answers: JSON.stringify(answers),
      completedAt: new Date(),
    });

    return NextResponse.json({
      score,
      passed,
      correct,
      total: questions.length,
      passMark: quiz[0].passMark,
      results: quiz[0].showAnswers ? results : undefined, // Only return if showAnswers is true
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { message: 'Failed to submit quiz', error: error.message },
      { status: 500 }
    );
  }
}
