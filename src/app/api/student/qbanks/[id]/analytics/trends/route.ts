import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPerformanceTrends } from '@/lib/qbank-analytics';

// GET - Performance over time
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
    const period = (url.searchParams.get('period') || '30d') as '7d' | '30d' | 'all';

    const trends = await getPerformanceTrends(enrollment[0].id, period);

    // Group by test mode
    const byMode: any = {
      tutorial: [],
      timed: [],
      assessment: [],
      overall: [],
    };

    for (const trend of trends) {
      const dataPoint = {
        date: trend.completedAt,
        score: trend.score || 0,
        correctCount: trend.correctCount || 0,
        questionCount: trend.questionCount || 0,
      };

      byMode.overall.push(dataPoint);
      if (trend.testMode === 'tutorial') {
        byMode.tutorial.push(dataPoint);
      } else if (trend.testMode === 'timed') {
        byMode.timed.push(dataPoint);
      } else if (trend.testMode === 'assessment') {
        byMode.assessment.push(dataPoint);
      }
    }

    return NextResponse.json({
      trends: byMode,
      period,
      totalTests: trends.length,
    });
  } catch (error: any) {
    logger.error('Get trends error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch trends', error: error.message },
      { status: 500 }
    );
  }
}

