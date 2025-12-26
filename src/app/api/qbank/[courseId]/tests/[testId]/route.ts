import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { 
  qbankTests, 
  questionBanks, 
  studentProgress,
  qbankQuestionAttempts,
  qbankQuestionStatistics,
  qbankQuestions
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET - Fetch specific test by testId
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; testId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = getDatabase();
    const courseIdNum = parseInt(params.courseId);
    const testId = params.testId;

    // Check enrollment
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseIdNum))
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this course' }, { status: 403 });
    }

    // Get test
    const test = await db
      .select()
      .from(qbankTests)
      .where(and(eq(qbankTests.testId, testId), eq(qbankTests.userId, decoded.id)))
      .limit(1);

    if (test.length === 0) {
      return NextResponse.json({ message: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({
      test: {
        id: test[0].id,
        testId: test[0].testId,
        title: test[0].title,
        mode: test[0].mode,
        testType: test[0].testType,
        organization: test[0].organization,
        questionIds: test[0].questionIds,
        totalQuestions: test[0].totalQuestions,
        status: test[0].status,
        timeLimit: test[0].timeLimit,
        createdAt: test[0].createdAt,
      },
    });
  } catch (error: any) {
    console.error('Get test by ID error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Submit test and update statistics
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; testId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = getDatabase();
    const courseIdNum = parseInt(params.courseId);
    const testId = params.testId;
    const body = await request.json();
    const { answers, score, percentage, status } = body;

    // Get the test
    const [test] = await db
      .select()
      .from(qbankTests)
      .where(and(eq(qbankTests.testId, testId), eq(qbankTests.userId, decoded.id)))
      .limit(1);

    if (!test) {
      return NextResponse.json({ message: 'Test not found' }, { status: 404 });
    }

    // Update test status
    await db
      .update(qbankTests)
      .set({
        status: status || 'completed',
        score: score || 0,
        percentage: percentage || 0,
        completedAt: new Date(),
      })
      .where(eq(qbankTests.id, test.id));

    // Process each answer and update statistics
    if (answers && Array.isArray(answers)) {
      const questionIds = JSON.parse(test.questionIds as string);
      
      for (const answer of answers) {
        const questionId = parseInt(answer.questionId);
        const userAnswer = answer.userAnswer;
        const isCorrect = answer.isCorrect || false;
        const isOmitted = answer.isOmitted || false;
        const pointsEarned = answer.pointsEarned || 0;
        const timeSpent = answer.timeSpent || 0;

        // Insert question attempt
        await db.insert(qbankQuestionAttempts).values({
          testId: test.id,
          questionId,
          userId: decoded.id,
          userAnswer: JSON.stringify(userAnswer),
          isCorrect,
          isOmitted,
          isPartiallyCorrect: answer.isPartiallyCorrect || false,
          pointsEarned,
          timeSpent,
        });

        // Update or create question statistics
        const [existingStats] = await db
          .select()
          .from(qbankQuestionStatistics)
          .where(
            and(
              eq(qbankQuestionStatistics.userId, decoded.id),
              eq(qbankQuestionStatistics.questionId, questionId)
            )
          )
          .limit(1);

        if (existingStats) {
          // Check if previously incorrect and now correct (for correct_on_reattempt)
          const wasIncorrect = existingStats.timesIncorrect > 0;
          const nowCorrectOnReattempt = wasIncorrect && isCorrect;

          // Update existing statistics
          await db
            .update(qbankQuestionStatistics)
            .set({
              timesAttempted: existingStats.timesAttempted + 1,
              timesCorrect: isCorrect ? existingStats.timesCorrect + 1 : existingStats.timesCorrect,
              timesIncorrect: !isCorrect && !isOmitted 
                ? existingStats.timesIncorrect + 1 
                : existingStats.timesIncorrect,
              timesOmitted: isOmitted ? existingStats.timesOmitted + 1 : existingStats.timesOmitted,
              timesCorrectOnReattempt: nowCorrectOnReattempt 
                ? existingStats.timesCorrectOnReattempt + 1 
                : existingStats.timesCorrectOnReattempt,
              lastAttemptedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(qbankQuestionStatistics.id, existingStats.id));
        } else {
          // Create new statistics record
          await db.insert(qbankQuestionStatistics).values({
            userId: decoded.id,
            questionId,
            questionBankId: test.questionBankId,
            timesAttempted: 1,
            timesCorrect: isCorrect ? 1 : 0,
            timesIncorrect: !isCorrect && !isOmitted ? 1 : 0,
            timesOmitted: isOmitted ? 1 : 0,
            timesCorrectOnReattempt: 0,
            lastAttemptedAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Test submitted successfully',
      test: {
        id: test.id,
        testId: test.testId,
        status: status || 'completed',
        score: score || 0,
        percentage: percentage || 0,
      },
    });
  } catch (error: any) {
    console.error('Submit test error:', error);
    return NextResponse.json(
      { message: 'Failed to submit test', error: error.message },
      { status: 500 }
    );
  }
}

