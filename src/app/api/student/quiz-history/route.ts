import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { qbankQuestionAttempts, qbankTests, qbankQuestions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch quiz history for a student
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    // Get all quiz tests for this user
    const quizTests = await db
      .select({
        id: qbankTests.id,
        testId: qbankTests.testId,
        title: qbankTests.title,
        mode: qbankTests.mode,
        status: qbankTests.status,
        score: qbankTests.score,
        maxScore: qbankTests.maxScore,
        percentage: qbankTests.percentage,
        totalQuestions: qbankTests.totalQuestions,
        startedAt: qbankTests.startedAt,
        completedAt: qbankTests.completedAt,
      })
      .from(qbankTests)
      .where(eq(qbankTests.userId, decoded.id))
      .orderBy(desc(qbankTests.createdAt));

    return NextResponse.json({
      quizHistory: quizTests,
      total: quizTests.length,
    });
  } catch (error) {
    console.error('Get quiz history error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Submit quiz attempt
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const { testId, answers, timeSpent } = await request.json();

    if (!testId || !answers) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get the test
    const test = await db.select().from(qbankTests).where(eq(qbankTests.testId, testId)).limit(1);

    if (test.length === 0) {
      return NextResponse.json({ message: 'Test not found' }, { status: 404 });
    }

    const currentTest = test[0];

    // Calculate score
    let correctCount = 0;
    let totalPoints = 0;

    for (const answer of answers) {
      const question = await db
        .select()
        .from(qbankQuestions)
        .where(eq(qbankQuestions.id, answer.questionId))
        .limit(1);

      if (question.length > 0) {
        const isCorrect = answer.userAnswer === question[0].correctAnswer;
        const pointsEarned = isCorrect ? question[0].points || 1 : 0;

        if (isCorrect) correctCount++;
        totalPoints += pointsEarned;

        // Record the attempt
        await db.insert(qbankQuestionAttempts).values({
          testId: currentTest.id,
          questionId: answer.questionId,
          userId: decoded.id,
          userAnswer: answer.userAnswer,
          isCorrect,
          isOmitted: answer.isOmitted || false,
          pointsEarned,
          timeSpent: answer.timeSpent || 0,
        });
      }
    }

    const percentage = (correctCount / currentTest.totalQuestions) * 100;

    // Update test with results
    await db
      .update(qbankTests)
      .set({
        status: 'completed',
        score: correctCount,
        maxScore: currentTest.totalQuestions,
        percentage,
        completedAt: new Date(),
      })
      .where(eq(qbankTests.id, currentTest.id));

    return NextResponse.json({
      message: 'Quiz submitted successfully',
      results: {
        score: correctCount,
        maxScore: currentTest.totalQuestions,
        percentage: percentage.toFixed(2),
        passed: percentage >= 70, // Default pass mark
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
