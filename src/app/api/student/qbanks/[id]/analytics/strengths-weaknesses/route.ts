import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getStrengthsAndWeaknesses } from '@/lib/qbank-analytics';

// GET - Identify strong and weak areas
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
    const threshold = parseInt(url.searchParams.get('threshold') || '60');

    const { strengths, weaknesses } = await getStrengthsAndWeaknesses(enrollment[0].id, threshold);

    return NextResponse.json({
      strengths: strengths.map(s => ({
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        accuracyPercentage: s.accuracyPercentage,
        questionsAttempted: s.questionsAttempted,
        questionsCorrect: s.questionsCorrect,
        performanceLevel: s.performanceLevel,
      })),
      weaknesses: weaknesses.map(w => ({
        categoryId: w.categoryId,
        categoryName: w.categoryName,
        accuracyPercentage: w.accuracyPercentage,
        questionsAttempted: w.questionsAttempted,
        questionsCorrect: w.questionsCorrect,
        performanceLevel: w.performanceLevel,
        needsRemediation: w.needsRemediation,
        priority: w.accuracyPercentage < 40 ? 'high' : w.accuracyPercentage < 50 ? 'medium' : 'low',
      })),
      threshold,
    });
  } catch (error: any) {
    logger.error('Get strengths/weaknesses error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch strengths/weaknesses', error: error.message },
      { status: 500 }
    );
  }
}

