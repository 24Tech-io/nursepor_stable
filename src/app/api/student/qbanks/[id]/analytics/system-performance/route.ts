import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankEnrollments,
  qbankQuestions,
  qbankQuestionAttempts,
  qbankTestAttempts,
  qbankTests
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

    // Verify enrollment
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

    // Get all test attempts for this enrollment
    const testAttempts = await db
      .select({ id: qbankTestAttempts.id })
      .from(qbankTestAttempts)
      .where(
        and(
          eq(qbankTestAttempts.enrollmentId, enrollment[0].id),
          eq(qbankTestAttempts.isCompleted, true)
        )
      );

    const testAttemptIds = testAttempts.map(t => t.id);

    if (testAttemptIds.length === 0) {
      return NextResponse.json({ systems: [] });
    }

    // Get all qbankTests created during the time windows of completed test attempts
    const testAttemptWindows = await db
      .select({
        id: qbankTestAttempts.id,
        startedAt: qbankTestAttempts.startedAt,
        completedAt: qbankTestAttempts.completedAt,
      })
      .from(qbankTestAttempts)
      .where(
        and(
          inArray(qbankTestAttempts.id, testAttemptIds),
          eq(qbankTestAttempts.isCompleted, true)
        )
      );

    if (testAttemptWindows.length === 0) {
      return NextResponse.json({ systems: [] });
    }

    // Get performance by system/lesson
    // Query all question attempts for this student in this qbank
    const allPerformance = await db
      .select({
        lesson: qbankQuestions.lesson,
        attemptedAt: qbankQuestionAttempts.attemptedAt,
        isCorrect: qbankQuestionAttempts.isCorrect,
        timeSpent: qbankQuestionAttempts.timeSpent,
      })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankQuestions, eq(qbankQuestionAttempts.questionId, qbankQuestions.id))
      .where(
        and(
          eq(qbankQuestionAttempts.userId, studentId),
          eq(qbankQuestions.questionBankId, qbankId)
        )
      );

    // Filter by test attempt time windows and aggregate
    const performanceMap: Record<string, { attempted: number; correct: number; totalTime: number; count: number }> = {};

    allPerformance.forEach((perf: any) => {
      const attemptedAt = new Date(perf.attemptedAt);
      // Check if this attempt falls within any completed test window
      const inWindow = testAttemptWindows.some((window: any) => {
        const start = new Date(window.startedAt);
        const end = window.completedAt ? new Date(window.completedAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
        return attemptedAt >= start && attemptedAt <= end;
      });

      if (inWindow && perf.lesson) {
        if (!performanceMap[perf.lesson]) {
          performanceMap[perf.lesson] = { attempted: 0, correct: 0, totalTime: 0, count: 0 };
        }
        performanceMap[perf.lesson].attempted++;
        if (perf.isCorrect) {
          performanceMap[perf.lesson].correct++;
        }
        if (perf.timeSpent) {
          performanceMap[perf.lesson].totalTime += Number(perf.timeSpent);
          performanceMap[perf.lesson].count++;
        }
      }
    });

    const performance = Object.entries(performanceMap).map(([lesson, data]) => ({
      lesson,
      attempted: data.attempted,
      correct: data.correct,
      avgTime: data.count > 0 ? data.totalTime / data.count : null,
    }));

    // Format response
    const systems = performance
      .filter((p: any) => p.lesson) // Filter out null lessons
      .map((perf: any) => ({
        lesson: perf.lesson,
        accuracyPercentage: perf.attempted > 0
          ? Math.round((Number(perf.correct) / Number(perf.attempted)) * 100)
          : 0,
        questionsAttempted: Number(perf.attempted) || 0,
        questionsCorrect: Number(perf.correct) || 0,
        averageTimeSeconds: perf.avgTime ? Math.round(Number(perf.avgTime)) : null,
      }))
      .sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);

    return NextResponse.json({ systems });
  } catch (error: any) {
    logger.error('Get system performance error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch system performance', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

