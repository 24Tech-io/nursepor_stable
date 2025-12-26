import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments, questionBanks, qbankSubjectPerformance, qbankTestAttempts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { calculateReadinessScore } from '@/lib/qbank-analytics';

// GET - Get dashboard overview metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const studentId = decoded.id;
    const qbankId = parseInt(params.id);

    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Get enrollment
    const enrollment = await db
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, studentId),
          eq(qbankEnrollments.qbankId, qbankId)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this Q-Bank' }, { status: 403 });
    }

    const enrollmentData = enrollment[0];

    // Get Q-Bank details
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Calculate readiness score
    const readiness = await calculateReadinessScore(
      enrollmentData.id,
      studentId,
      qbankId
    );

    // Update enrollment with latest readiness score
    await db
      .update(qbankEnrollments)
      .set({
        readinessScore: readiness.score,
        readinessLevel: readiness.level,
        lastReadinessCalculation: new Date(),
      })
      .where(eq(qbankEnrollments.id, enrollmentData.id));

    // Get subject performance breakdown
    const subjectPerformance = await db
      .select()
      .from(qbankSubjectPerformance)
      .where(eq(qbankSubjectPerformance.enrollmentId, enrollmentData.id));

    // Get recent test history (last 10 tests)
    const recentTests = await db
      .select({
        id: qbankTestAttempts.id,
        score: qbankTestAttempts.score,
        correctCount: qbankTestAttempts.correctCount,
        incorrectCount: qbankTestAttempts.incorrectCount,
        questionCount: qbankTestAttempts.questionCount,
        testMode: qbankTestAttempts.testMode,
        completedAt: qbankTestAttempts.completedAt,
        isPassed: qbankTestAttempts.isPassed,
        performanceBreakdown: qbankTestAttempts.performanceBreakdown,
      })
      .from(qbankTestAttempts)
      .where(
        and(
          eq(qbankTestAttempts.studentId, studentId),
          eq(qbankTestAttempts.qbankId, qbankId),
          eq(qbankTestAttempts.isCompleted, true)
        )
      )
      .orderBy(desc(qbankTestAttempts.completedAt))
      .limit(10);

    // Format subject performance for frontend
    const subjectBreakdown = subjectPerformance.map(sp => ({
      subject: sp.subject,
      lesson: sp.lesson,
      clientNeedArea: sp.clientNeedArea,
      questionsAttempted: sp.questionsAttempted,
      questionsCorrect: sp.questionsCorrect,
      accuracy: sp.accuracyPercentage,
      performanceLevel: sp.performanceLevel,
    }));

    // Calculate correctness percentages
    const questionsCorrect = enrollmentData.questionsCorrect || 0;
    const questionsAttempted = enrollmentData.questionsAttempted || 0;
    const overallAccuracy = questionsAttempted > 0
      ? Math.round((questionsCorrect / questionsAttempted) * 100)
      : 0;

    return NextResponse.json({
      // Readiness metrics
      readinessScore: readiness.score,
      readinessLevel: readiness.level,
      readinessBreakdown: readiness.breakdown,

      // Overall stats
      questionsAttempted: enrollmentData.questionsAttempted,
      questionsCorrect: enrollmentData.questionsCorrect,
      overallAccuracy: overallAccuracy,
      totalQuestions: qbank[0]?.totalQuestions || 0,
      progress: enrollmentData.progress,

      // Score metrics
      averageScore: Math.round((enrollmentData.averageScore || 0) * 10) / 10,
      highestScore: Math.round((enrollmentData.highestScore || 0) * 10) / 10,
      lowestScore: Math.round((enrollmentData.lowestScore || 0) * 10) / 10,

      // Time metrics
      timeSpentHours: Math.round((enrollmentData.totalTimeSpentMinutes || 0) / 60 * 10) / 10,
      timeSpentMinutes: enrollmentData.totalTimeSpentMinutes || 0,

      // Test counts
      testsCompleted: enrollmentData.testsCompleted,
      tutorialTestsCompleted: enrollmentData.tutorialTestsCompleted,
      timedTestsCompleted: enrollmentData.timedTestsCompleted,
      assessmentTestsCompleted: enrollmentData.assessmentTestsCompleted,

      // Subject breakdown (ArcherReview-style)
      subjectBreakdown: subjectBreakdown,

      // Recent test history
      recentTests: recentTests.map(t => ({
        id: t.id,
        score: Math.round((t.score || 0) * 10) / 10,
        correctCount: t.correctCount,
        incorrectCount: t.incorrectCount,
        totalQuestions: t.questionCount,
        testMode: t.testMode,
        completedAt: t.completedAt,
        isPassed: t.isPassed,
      })),
    });
  } catch (error: any) {
    logger.error('Get analytics overview error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics', error: error.message },
      { status: 500 }
    );
  }
}


