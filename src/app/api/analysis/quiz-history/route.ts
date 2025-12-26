import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankTestAttempts,
  quizAttempts,
  questionBanks,
  courses,
  chapters,
  modules
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Unified Quiz & Test Analysis API
 * Works for both students and admins
 * GET /api/analysis/quiz-history?studentId=123 (admin) or /api/analysis/quiz-history (student)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');

    // Get token from cookies (supports both admin and student tokens)
    const token = request.cookies.get('admin_token')?.value
      || request.cookies.get('adminToken')?.value
      || request.cookies.get('student_token')?.value
      || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    // Determine student ID: admin can specify, student uses their own
    let studentId: number;
    if (studentIdParam) {
      // Admin viewing specific student
      if (decoded.role !== 'admin') {
        return NextResponse.json({ message: 'Admin access required to view other students' }, { status: 403 });
      }
      studentId = parseInt(studentIdParam);
    } else {
      // Student viewing their own data
      if (decoded.role !== 'student') {
        return NextResponse.json({ message: 'Student access required' }, { status: 403 });
      }
      studentId = decoded.id;
    }

    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Fetch Q-Bank test attempts with detailed analysis
    const qbankTestsData = await db
      .select({
        id: qbankTestAttempts.id,
        testMode: qbankTestAttempts.testMode,
        testType: qbankTestAttempts.testType,
        questionCount: qbankTestAttempts.questionCount,
        score: qbankTestAttempts.score,
        correctCount: qbankTestAttempts.correctCount,
        incorrectCount: qbankTestAttempts.incorrectCount,
        unansweredCount: qbankTestAttempts.unansweredCount,
        timeSpentSeconds: qbankTestAttempts.timeSpentSeconds,
        timeLimitMinutes: qbankTestAttempts.timeLimitMinutes,
        isCompleted: qbankTestAttempts.isCompleted,
        isPassed: qbankTestAttempts.isPassed,
        startedAt: qbankTestAttempts.startedAt,
        completedAt: qbankTestAttempts.completedAt,
        qbankName: questionBanks.name,
        qbankId: questionBanks.id,
        categoryFilter: qbankTestAttempts.categoryFilter,
        difficultyFilter: qbankTestAttempts.difficultyFilter,
      })
      .from(qbankTestAttempts)
      .innerJoin(questionBanks, eq(qbankTestAttempts.qbankId, questionBanks.id))
      .where(
        and(
          eq(qbankTestAttempts.studentId, studentId),
          eq(qbankTestAttempts.isCompleted, true)
        )
      )
      .orderBy(desc(qbankTestAttempts.completedAt));

    // Fetch course quiz attempts with detailed analysis
    let quizAttemptsData: any[] = [];
    try {
      quizAttemptsData = await db
        .select({
          id: quizAttempts.id,
          chapterId: quizAttempts.chapterId,
          score: quizAttempts.score,
          totalQuestions: quizAttempts.totalQuestions,
          correctAnswers: quizAttempts.correctAnswers,
          passed: quizAttempts.passed,
          attemptedAt: quizAttempts.attemptedAt,
          timeTaken: quizAttempts.timeTaken,
          chapterTitle: chapters.title,
          courseTitle: courses.title,
          courseId: courses.id,
        })
        .from(quizAttempts)
        .innerJoin(chapters, eq(quizAttempts.chapterId, chapters.id))
        .innerJoin(modules, eq(chapters.moduleId, modules.id))
        .leftJoin(courses, eq(modules.courseId, courses.id))
        .where(eq(quizAttempts.userId, studentId))
        .orderBy(desc(quizAttempts.attemptedAt));
    } catch (quizError: any) {
      logger.warn('Could not fetch course quiz attempts:', quizError.message);
      quizAttemptsData = [];
    }

    // Format Q-Bank tests with comprehensive analysis
    const formattedQBankTests = qbankTestsData.map((test: any) => {
      const percentage = test.questionCount > 0
        ? ((test.correctCount || 0) / test.questionCount) * 100
        : 0;
      const accuracy = test.questionCount > 0 && (test.correctCount + test.incorrectCount) > 0
        ? ((test.correctCount || 0) / (test.correctCount + test.incorrectCount || 1)) * 100
        : 0;

      return {
        id: test.id,
        type: 'qbank',
        title: test.qbankName || 'Q-Bank Test',
        testMode: test.testMode,
        testType: test.testType,
        questionCount: test.questionCount,
        score: test.score,
        correctCount: test.correctCount || 0,
        incorrectCount: test.incorrectCount || 0,
        unansweredCount: test.unansweredCount || 0,
        percentage: parseFloat(percentage.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        timeSpentMinutes: Math.round((test.timeSpentSeconds || 0) / 60 * 10) / 10,
        timeLimitMinutes: test.timeLimitMinutes,
        averageTimePerQuestion: test.questionCount > 0 && test.timeSpentSeconds
          ? parseFloat((test.timeSpentSeconds / test.questionCount / 60).toFixed(2))
          : null,
        isPassed: test.isPassed,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        qbankId: test.qbankId,
        categoryFilter: test.categoryFilter,
        difficultyFilter: test.difficultyFilter,
      };
    });

    // Format quiz attempts with comprehensive analysis
    const formattedQuizzes = quizAttemptsData.map((attempt: any) => {
      const percentage = attempt.totalQuestions > 0
        ? (attempt.correctAnswers / attempt.totalQuestions) * 100
        : 0;
      const accuracy = attempt.totalQuestions > 0
        ? (attempt.correctAnswers / attempt.totalQuestions) * 100
        : 0;

      return {
        id: attempt.id,
        type: 'quiz',
        title: attempt.chapterTitle || 'Course Quiz',
        courseTitle: attempt.courseTitle,
        courseId: attempt.courseId,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.totalQuestions - attempt.correctAnswers,
        percentage: parseFloat(percentage.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        passed: attempt.passed,
        completedAt: attempt.attemptedAt,
        timeTakenSeconds: attempt.timeTaken,
        timeTakenMinutes: attempt.timeTaken ? Math.round(attempt.timeTaken / 60 * 10) / 10 : null,
        averageTimePerQuestion: attempt.totalQuestions > 0 && attempt.timeTaken
          ? parseFloat((attempt.timeTaken / attempt.totalQuestions).toFixed(2))
          : null,
        chapterId: attempt.chapterId,
      };
    });

    // Combine and sort by completion date
    const allAttempts = [...formattedQBankTests, ...formattedQuizzes].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Calculate comprehensive statistics
    const totalAttempts = allAttempts.length;
    const qbankAttemptCount = formattedQBankTests.length;
    const quizAttemptCount = formattedQuizzes.length;

    const passedAttempts = allAttempts.filter(a => a.isPassed || (a.passed !== false && (a.percentage || 0) >= 70)).length;
    const failedAttempts = totalAttempts - passedAttempts;

    const avgPercentage = totalAttempts > 0
      ? allAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts
      : 0;

    const avgAccuracy = totalAttempts > 0
      ? allAttempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalAttempts
      : 0;

    const bestScore = totalAttempts > 0
      ? Math.max(...allAttempts.map(a => a.percentage || 0))
      : 0;

    const worstScore = totalAttempts > 0
      ? Math.min(...allAttempts.map(a => a.percentage || 0))
      : 0;

    // Calculate average time per question across all attempts
    const attemptsWithTime = allAttempts.filter(a => a.averageTimePerQuestion !== null && a.averageTimePerQuestion !== undefined);
    const avgTimePerQuestion = attemptsWithTime.length > 0
      ? attemptsWithTime.reduce((sum, a) => sum + (a.averageTimePerQuestion || 0), 0) / attemptsWithTime.length
      : null;

    // Performance trends (last 10 attempts)
    const recentAttempts = allAttempts.slice(0, 10);
    const trend = recentAttempts.length >= 2
      ? recentAttempts[0].percentage - recentAttempts[recentAttempts.length - 1].percentage
      : 0;

    // Performance by type
    const qbankAvg = qbankAttemptCount > 0
      ? formattedQBankTests.reduce((sum, t) => sum + (t.percentage || 0), 0) / qbankAttemptCount
      : 0;

    const quizAvg = quizAttemptCount > 0
      ? formattedQuizzes.reduce((sum, q) => sum + (q.percentage || 0), 0) / quizAttemptCount
      : 0;

    logger.info(`✅ Unified analysis: ${qbankAttemptCount} Q-Bank tests, ${quizAttemptCount} quizzes for student ${studentId}`);

    return NextResponse.json({
      studentId,
      attempts: allAttempts,
      qbankTests: formattedQBankTests,
      quizzes: formattedQuizzes,
      statistics: {
        totalAttempts,
        qbankAttempts: qbankAttemptCount,
        quizAttempts: quizAttemptCount,
        passedAttempts,
        failedAttempts,
        passRate: totalAttempts > 0 ? parseFloat(((passedAttempts / totalAttempts) * 100).toFixed(2)) : 0,
        averagePercentage: parseFloat(avgPercentage.toFixed(2)),
        averageAccuracy: parseFloat(avgAccuracy.toFixed(2)),
        bestScore: parseFloat(bestScore.toFixed(2)),
        worstScore: parseFloat(worstScore.toFixed(2)),
        averageTimePerQuestion: avgTimePerQuestion ? parseFloat(avgTimePerQuestion.toFixed(2)) : null,
        trend: parseFloat(trend.toFixed(2)),
        qbankAverage: parseFloat(qbankAvg.toFixed(2)),
        quizAverage: parseFloat(quizAvg.toFixed(2)),
      },
      total: totalAttempts,
    });
  } catch (error: any) {
    logger.error('Unified quiz analysis error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analysis', error: error.message },
      { status: 500 }
    );
  }
}
