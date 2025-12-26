import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankTestAttempts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    if (!attemptId) {
      return NextResponse.json({ message: 'Attempt ID is required' }, { status: 400 });
    }

    const attemptIdNum = parseInt(attemptId);
    if (isNaN(attemptIdNum) || attemptIdNum <= 0) {
      return NextResponse.json({ message: 'Invalid attempt ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Get test attempt
    const [testAttempt] = await db
      .select()
      .from(qbankTestAttempts)
      .where(
        and(
          eq(qbankTestAttempts.id, attemptIdNum),
          eq(qbankTestAttempts.studentId, studentId),
          eq(qbankTestAttempts.qbankId, qbankId)
        )
      )
      .limit(1);

    if (!testAttempt) {
      return NextResponse.json({ message: 'Test attempt not found' }, { status: 404 });
    }

    return NextResponse.json({
      attemptId: testAttempt.id,
      score: testAttempt.score || 0,
      correctCount: testAttempt.correctCount || 0,
      incorrectCount: testAttempt.incorrectCount || 0,
      unansweredCount: testAttempt.unansweredCount || 0,
      totalQuestions: testAttempt.questionCount,
      isPassed: testAttempt.isPassed || false,
      timeSpent: testAttempt.timeSpentSeconds || 0,
      testMode: testAttempt.testMode,
      completedAt: testAttempt.completedAt,
    });
  } catch (error: any) {
    logger.error('Error fetching test results:', error);
    return NextResponse.json(
      { message: 'Failed to fetch results', error: error.message },
      { status: 500 }
    );
  }
}

