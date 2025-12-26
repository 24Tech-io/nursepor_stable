import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { questionBanks, qbankQuestions, qbankTests, qbankQuestionAttempts, qbankEnrollments, users } from '@/lib/db/schema';
import { eq, sql, and, count, desc } from 'drizzle-orm';

// GET - Get Q-Bank analysis and statistics
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

    const db = await getDatabaseWithRetry();

    // Verify Q-Bank exists
    const [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Get total questions
    const totalQuestions = await db
      .select({ count: count() })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId));

    // Get questions by type
    const questionsByType = await db
      .select({
        questionType: qbankQuestions.questionType,
        testType: qbankQuestions.testType,
        count: count(),
      })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .groupBy(qbankQuestions.questionType, qbankQuestions.testType);

    // Get questions by subject
    const questionsBySubject = await db
      .select({
        subject: qbankQuestions.subject,
        count: count(),
      })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .groupBy(qbankQuestions.subject);

    // Get questions by difficulty
    const questionsByDifficulty = await db
      .select({
        difficulty: qbankQuestions.difficulty,
        count: count(),
      })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .groupBy(qbankQuestions.difficulty);

    // Get total tests taken
    const totalTests = await db
      .select({ count: count() })
      .from(qbankTests)
      .where(eq(qbankTests.questionBankId, qbankId));

    // Get average score
    const avgScore = await db
      .select({
        avgPercentage: sql<number>`AVG(${qbankTests.percentage})`,
      })
      .from(qbankTests)
      .where(
        and(
          eq(qbankTests.questionBankId, qbankId),
          sql`${qbankTests.percentage} IS NOT NULL`
        )
      );

    // Get question performance (most/least answered correctly)
    const questionPerformance = await db
      .select({
        questionId: qbankQuestionAttempts.questionId,
        totalAttempts: count(),
        correctAttempts: sql<number>`SUM(CASE WHEN ${qbankQuestionAttempts.isCorrect} = true THEN 1 ELSE 0 END)`,
      })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankTests, eq(qbankQuestionAttempts.testId, qbankTests.id))
      .where(eq(qbankTests.questionBankId, qbankId))
      .groupBy(qbankQuestionAttempts.questionId);

    // Get student enrollment stats
    const enrollmentStats = await db
      .select({
        studentId: qbankEnrollments.studentId,
        studentName: users.name,
        studentEmail: users.email,
        testsCompleted: qbankEnrollments.testsCompleted,
        questionsAttempted: qbankEnrollments.questionsAttempted,
        questionsCorrect: qbankEnrollments.questionsCorrect,
        averageScore: qbankEnrollments.averageScore,
        highestScore: qbankEnrollments.highestScore,
        progress: qbankEnrollments.progress,
        readinessScore: qbankEnrollments.readinessScore,
        readinessLevel: qbankEnrollments.readinessLevel,
        lastAccessedAt: qbankEnrollments.lastAccessedAt,
        enrolledAt: qbankEnrollments.enrolledAt,
      })
      .from(qbankEnrollments)
      .innerJoin(users, eq(qbankEnrollments.studentId, users.id))
      .where(eq(qbankEnrollments.qbankId, qbankId))
      .orderBy(desc(qbankEnrollments.lastAccessedAt));

    // Calculate readiness distribution
    const readinessDistribution = {
      very_high: enrollmentStats.filter(e => e.readinessLevel === 'very_high').length,
      high: enrollmentStats.filter(e => e.readinessLevel === 'high').length,
      borderline: enrollmentStats.filter(e => e.readinessLevel === 'borderline').length,
      low: enrollmentStats.filter(e => e.readinessLevel === 'low').length,
      insufficient_data: enrollmentStats.filter(e => !e.readinessLevel || e.readinessLevel === 'insufficient_data').length,
    };

    // Calculate statistics
    const classicCount = questionsByType
      .filter(q => q.testType === 'classic')
      .reduce((sum, q) => sum + Number(q.count), 0);

    const ngnCount = questionsByType
      .filter(q => q.testType === 'ngn')
      .reduce((sum, q) => sum + Number(q.count), 0);

    const mixedCount = questionsByType
      .filter(q => q.testType === 'mixed')
      .reduce((sum, q) => sum + Number(q.count), 0);

    return NextResponse.json({
      qbank: {
        id: qbank.id,
        name: qbank.name,
        description: qbank.description,
      },
      statistics: {
        totalQuestions: totalQuestions[0]?.count || 0,
        totalTests: totalTests[0]?.count || 0,
        totalEnrollments: enrollmentStats.length,
        activeStudents: enrollmentStats.filter(e => e.testsCompleted && e.testsCompleted > 0).length,
        averageScore: avgScore[0]?.avgPercentage ? parseFloat(avgScore[0].avgPercentage.toString()) : null,
        classicCount,
        ngnCount,
        mixedCount,
      },
      readinessDistribution,
      breakdown: {
        byType: questionsByType.map(q => ({
          type: q.questionType,
          testType: q.testType,
          count: Number(q.count),
        })),
        bySubject: questionsBySubject
          .filter(q => q.subject)
          .map(q => ({
            subject: q.subject,
            count: Number(q.count),
          })),
        byDifficulty: questionsByDifficulty
          .filter(q => q.difficulty)
          .map(q => ({
            difficulty: q.difficulty,
            count: Number(q.count),
          })),
      },
      studentPerformance: enrollmentStats.map(e => ({
        studentId: e.studentId,
        studentName: e.studentName,
        studentEmail: e.studentEmail,
        testsCompleted: e.testsCompleted || 0,
        questionsAttempted: e.questionsAttempted || 0,
        questionsCorrect: e.questionsCorrect || 0,
        accuracy: (e.questionsAttempted || 0) > 0
          ? Math.round(((e.questionsCorrect || 0) / (e.questionsAttempted || 1)) * 100)
          : 0,
        averageScore: Math.round((e.averageScore || 0) * 10) / 10,
        highestScore: Math.round((e.highestScore || 0) * 10) / 10,
        progress: e.progress || 0,
        readinessScore: e.readinessScore || 0,
        readinessLevel: e.readinessLevel || 'insufficient_data',
        lastAccessedAt: e.lastAccessedAt,
        enrolledAt: e.enrolledAt,
      })),
      performance: questionPerformance.map(p => ({
        questionId: p.questionId,
        totalAttempts: Number(p.totalAttempts),
        correctAttempts: Number(p.correctAttempts),
        accuracy: Number(p.totalAttempts) > 0
          ? (Number(p.correctAttempts) / Number(p.totalAttempts)) * 100
          : 0,
      })),
    });
  } catch (error: any) {
    logger.error('Get Q-Bank analysis error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analysis', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

