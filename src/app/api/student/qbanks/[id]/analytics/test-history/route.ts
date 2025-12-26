import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments, qbankTestAttempts } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Historical test attempts
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const tests = await db
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
      })
      .from(qbankTestAttempts)
      .where(
        and(
          eq(qbankTestAttempts.enrollmentId, enrollment[0].id),
          eq(qbankTestAttempts.isCompleted, true)
        )
      )
      .orderBy(desc(qbankTestAttempts.completedAt))
      .limit(limit);

    return NextResponse.json({
      tests: tests.map(t => ({
        ...t,
        timeSpentMinutes: Math.round((t.timeSpentSeconds || 0) / 60 * 10) / 10,
        accuracy: t.questionCount > 0 ? ((t.correctCount || 0) / t.questionCount) * 100 : 0,
      })),
      total: tests.length,
    });
  } catch (error: any) {
    logger.error('Get test history error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch test history', error: error.message },
      { status: 500 }
    );
  }
}

