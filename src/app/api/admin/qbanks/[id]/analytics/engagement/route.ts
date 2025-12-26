import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  questionBanks,
  qbankEnrollments,
  qbankQuestionAttempts,
  qbankTests
} from '@/lib/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const qbankId = parseInt(params.id);
    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Verify Q-Bank exists
    const [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Get enrollments for this Q-Bank
    const enrollments = await db
      .select({ id: qbankEnrollments.id })
      .from(qbankEnrollments)
      .where(eq(qbankEnrollments.qbankId, qbankId));

    const enrollmentIds = enrollments.map(e => e.id);

    if (enrollmentIds.length === 0) {
      return NextResponse.json({
        avgQuestionsPerDay: 0,
        totalQuestionsAttempted: 0,
        activeStudentsLast7Days: 0,
      });
    }

    // Get total questions attempted
    // qbankQuestionAttempts.testId references qbankTests.id, not qbankEnrollments.id
    const totalAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankTests, eq(qbankQuestionAttempts.testId, qbankTests.id))
      .innerJoin(qbankEnrollments, 
        and(
          eq(qbankTests.userId, qbankEnrollments.studentId),
          eq(qbankTests.questionBankId, qbankEnrollments.qbankId)
        )
      )
      .where(sql`${qbankEnrollments.id} = ANY(${enrollmentIds})`);

    // Get daily stats for average calculation
    const dailyStats = await db
      .select({
        day: sql<string>`date(${qbankQuestionAttempts.attemptedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankTests, eq(qbankQuestionAttempts.testId, qbankTests.id))
      .innerJoin(qbankEnrollments,
        and(
          eq(qbankTests.userId, qbankEnrollments.studentId),
          eq(qbankTests.questionBankId, qbankEnrollments.qbankId)
        )
      )
      .where(
        and(
          sql`${qbankEnrollments.id} = ANY(${enrollmentIds})`,
          gte(qbankQuestionAttempts.attemptedAt, sql`NOW() - INTERVAL '30 days'`)
        )
      )
      .groupBy(sql`date(${qbankQuestionAttempts.attemptedAt})`);

    const avgQuestionsPerDay = dailyStats.length > 0
      ? dailyStats.reduce((sum, stat) => sum + Number(stat.count), 0) / dailyStats.length
      : 0;

    // Get active students in last 7 days
    const activeStudents = await db
      .select({ count: sql<number>`count(distinct ${qbankQuestionAttempts.userId})` })
      .from(qbankQuestionAttempts)
      .innerJoin(qbankTests, eq(qbankQuestionAttempts.testId, qbankTests.id))
      .innerJoin(qbankEnrollments,
        and(
          eq(qbankTests.userId, qbankEnrollments.studentId),
          eq(qbankTests.questionBankId, qbankEnrollments.qbankId)
        )
      )
      .where(
        and(
          sql`${qbankEnrollments.id} = ANY(${enrollmentIds})`,
          gte(qbankQuestionAttempts.attemptedAt, sql`NOW() - INTERVAL '7 days'`)
        )
      );

    return NextResponse.json({
      avgQuestionsPerDay: Math.round(avgQuestionsPerDay * 10) / 10,
      totalQuestionsAttempted: Number(totalAttempts[0]?.count) || 0,
      activeStudentsLast7Days: Number(activeStudents[0]?.count) || 0,
    });
  } catch (error: any) {
    logger.error('Get engagement error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch engagement', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

