import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankEnrollments,
  qbankTestAttempts
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Get last 5 completed tests
    const recentTests = await db
      .select()
      .from(qbankTestAttempts)
      .where(
        and(
          eq(qbankTestAttempts.enrollmentId, enrollment[0].id),
          eq(qbankTestAttempts.isCompleted, true)
        )
      )
      .orderBy(desc(qbankTestAttempts.completedAt))
      .limit(5);

    if (recentTests.length === 0) {
      return NextResponse.json({
        probability: 0,
        level: 'Insufficient Data',
        message: 'Complete at least one test to get a readiness assessment',
        recentScores: [],
        averageScore: 0,
      });
    }

    // Calculate average score from last 5 tests
    const scores = recentTests.map(test => test.score || 0).filter(score => score > 0);
    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    // Calculate probability of passing (based on average score)
    // NCLEX passing threshold is typically around 50-60% depending on difficulty
    // We'll use a logistic curve: probability increases with score
    let probability = 0;
    if (averageScore >= 75) {
      probability = 95; // Very high confidence
    } else if (averageScore >= 65) {
      probability = 85; // High confidence
    } else if (averageScore >= 55) {
      probability = 65; // Moderate confidence
    } else if (averageScore >= 45) {
      probability = 40; // Low confidence
    } else {
      probability = 20; // Very low confidence
    }

    // Adjust based on trend (improving vs declining)
    if (scores.length >= 2) {
      const recentTrend = scores[0] - scores[scores.length - 1];
      if (recentTrend > 5) {
        probability = Math.min(95, probability + 5); // Improving trend
      } else if (recentTrend < -5) {
        probability = Math.max(10, probability - 5); // Declining trend
      }
    }

    // Determine level
    let level = 'Very Low';
    if (probability >= 80) level = 'High';
    else if (probability >= 60) level = 'Moderate';
    else if (probability >= 40) level = 'Low';
    else level = 'Very Low';

    return NextResponse.json({
      probability: Math.round(probability),
      level,
      message: probability >= 70
        ? 'You are well-prepared for the NCLEX exam!'
        : probability >= 50
          ? 'Continue practicing to improve your readiness.'
          : 'Focus on weak areas and complete more practice tests.',
      recentScores: scores,
      averageScore: Math.round(averageScore),
      testsAnalyzed: recentTests.length,
    });
  } catch (error: any) {
    logger.error('Get readiness assessment error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch readiness assessment', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

