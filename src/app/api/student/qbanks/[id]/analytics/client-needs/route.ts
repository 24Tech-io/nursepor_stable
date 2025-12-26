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
      // Return empty data structure
      return NextResponse.json({
        clientNeeds: [
          { name: 'Safe and Effective Care Environment', score: 0, attempted: 0, correct: 0 },
          { name: 'Health Promotion and Maintenance', score: 0, attempted: 0, correct: 0 },
          { name: 'Psychosocial Integrity', score: 0, attempted: 0, correct: 0 },
          { name: 'Physiological Integrity', score: 0, attempted: 0, correct: 0 },
        ],
      });
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
      return NextResponse.json({
        clientNeeds: [
          { name: 'Safe and Effective Care Environment', score: 0, attempted: 0, correct: 0 },
          { name: 'Health Promotion and Maintenance', score: 0, attempted: 0, correct: 0 },
          { name: 'Psychosocial Integrity', score: 0, attempted: 0, correct: 0 },
          { name: 'Physiological Integrity', score: 0, attempted: 0, correct: 0 },
        ],
      });
    }

    // Get performance by client need area
    // Query all question attempts for this student in this qbank
    // Filter by time windows of completed tests
    const allPerformance = await db
      .select({
        clientNeedArea: qbankQuestions.clientNeedArea,
        attemptedAt: qbankQuestionAttempts.attemptedAt,
        isCorrect: qbankQuestionAttempts.isCorrect,
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
    const performanceMap: Record<string, { attempted: number; correct: number }> = {};

    allPerformance.forEach((perf: any) => {
      if (!perf.attemptedAt) return;

      const attemptedAt = new Date(perf.attemptedAt);
      // Check if this attempt falls within any completed test window
      const inWindow = testAttemptWindows.some((window: any) => {
        if (!window.startedAt) return false;
        const start = new Date(window.startedAt);
        const end = window.completedAt ? new Date(window.completedAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000); // Default 24h window
        return attemptedAt >= start && attemptedAt <= end;
      });

      if (inWindow && perf.clientNeedArea) {
        if (!performanceMap[perf.clientNeedArea]) {
          performanceMap[perf.clientNeedArea] = { attempted: 0, correct: 0 };
        }
        performanceMap[perf.clientNeedArea].attempted++;
        if (perf.isCorrect) {
          performanceMap[perf.clientNeedArea].correct++;
        }
      }
    });

    const performance = Object.entries(performanceMap).map(([clientNeedArea, data]) => ({
      clientNeedArea,
      attempted: data.attempted,
      correct: data.correct,
    }));

    // Map to standard client needs
    const clientNeedsMap: Record<string, { attempted: number; correct: number }> = {
      'Safe and Effective Care Environment': { attempted: 0, correct: 0 },
      'Health Promotion and Maintenance': { attempted: 0, correct: 0 },
      'Psychosocial Integrity': { attempted: 0, correct: 0 },
      'Physiological Integrity': { attempted: 0, correct: 0 },
    };

    performance.forEach((perf: any) => {
      if (perf.clientNeedArea && clientNeedsMap[perf.clientNeedArea]) {
        clientNeedsMap[perf.clientNeedArea].attempted += Number(perf.attempted) || 0;
        clientNeedsMap[perf.clientNeedArea].correct += Number(perf.correct) || 0;
      }
    });

    // Format response
    const clientNeeds = Object.entries(clientNeedsMap).map(([name, data]) => ({
      name,
      score: data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0,
      attempted: data.attempted,
      correct: data.correct,
    }));

    return NextResponse.json({ clientNeeds });
  } catch (error: any) {
    logger.error('Get client needs performance error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch client needs performance', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

