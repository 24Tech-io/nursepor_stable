import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { qbankTests, qbankQuestionAttempts, qbankQuestions, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Fetch individual student's detailed Q-Bank performance
export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.studentId);
    const db = getDatabase();

    // Get student info
    const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Get all tests for this student
    const tests = await db
      .select()
      .from(qbankTests)
      .where(eq(qbankTests.userId, studentId))
      .orderBy(desc(qbankTests.createdAt));

    // Get all question attempts
    const attempts = await db
      .select({
        attemptId: qbankQuestionAttempts.id,
        questionId: qbankQuestionAttempts.questionId,
        testId: qbankQuestionAttempts.testId,
        isCorrect: qbankQuestionAttempts.isCorrect,
        userAnswer: qbankQuestionAttempts.userAnswer,
        attemptedAt: qbankQuestionAttempts.attemptedAt,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        subject: qbankQuestions.subject,
        difficulty: qbankQuestions.difficulty,
      })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankQuestions, eq(qbankQuestionAttempts.questionId, qbankQuestions.id))
      .where(eq(qbankQuestionAttempts.userId, studentId))
      .orderBy(desc(qbankQuestionAttempts.attemptedAt))
      .limit(200); // Last 200 attempts

    // Calculate subject performance
    const subjectPerformance: any = {};
    attempts.forEach((attempt) => {
      const subject = attempt.subject || 'Unknown';
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = {
          total: 0,
          correct: 0,
          incorrect: 0,
        };
      }
      subjectPerformance[subject].total++;
      if (attempt.isCorrect) {
        subjectPerformance[subject].correct++;
      } else {
        subjectPerformance[subject].incorrect++;
      }
    });

    // Format subject performance
    const subjectStats = Object.keys(subjectPerformance).map((subject) => ({
      subject,
      total: subjectPerformance[subject].total,
      correct: subjectPerformance[subject].correct,
      incorrect: subjectPerformance[subject].incorrect,
      accuracy: Math.round(
        (subjectPerformance[subject].correct / subjectPerformance[subject].total) * 100
      ),
    }));

    return NextResponse.json({
      student: {
        id: student[0].id,
        name: student[0].name,
        email: student[0].email,
      },
      tests: tests.map((test) => ({
        id: test.id,
        testId: test.testId,
        title: test.title,
        mode: test.mode,
        testType: test.testType,
        totalQuestions: test.totalQuestions,
        status: test.status,
        score: test.score,
        maxScore: test.maxScore,
        percentage: test.percentage,
        createdAt: test.createdAt,
        completedAt: test.completedAt,
      })),
      recentAttempts: attempts.slice(0, 50),
      subjectPerformance: subjectStats.sort((a, b) => b.total - a.total),
      summary: {
        totalTests: tests.length,
        completedTests: tests.filter((t) => t.status === 'completed').length,
        totalAttempts: attempts.length,
        uniqueQuestions: new Set(attempts.map((a) => a.questionId)).size,
        overallAccuracy: attempts.length > 0
          ? Math.round((attempts.filter((a) => a.isCorrect).length / attempts.length) * 100)
          : 0,
      },
    });
  } catch (error: any) {
    console.error('Get student Q-Bank details error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch student details', error: error.message },
      { status: 500 }
    );
  }
}



