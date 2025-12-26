import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getRemediationQuestions } from '@/lib/qbank-analytics';

// GET - Questions needing review
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

    const remediation = await getRemediationQuestions(enrollment[0].id);

    return NextResponse.json({
      questions: remediation.map(q => ({
        questionId: q.questionId,
        question: q.question,
        categoryId: q.categoryId,
        categoryName: q.categoryName,
        totalAttempts: q.totalAttempts,
        consecutiveCorrect: q.consecutiveCorrect,
        firstIncorrectAt: q.firstIncorrectAt,
        needsRemediation: q.needsRemediation,
        remediationCompleted: q.remediationCompleted,
      })),
      total: remediation.length,
    });
  } catch (error: any) {
    logger.error('Get remediation questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch remediation questions', error: error.message },
      { status: 500 }
    );
  }
}

