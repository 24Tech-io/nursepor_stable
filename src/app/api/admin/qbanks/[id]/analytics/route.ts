import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { 
  questionBanks,
  qbankEnrollments,
  qbankTestAttempts
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

    const db = await getDatabaseWithRetry();

    // Verify Q-Bank exists
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Get total enrollments
    const totalEnrollments = await db
      .select({ count: sql<number>`count(*)` })
      .from(qbankEnrollments)
      .where(eq(qbankEnrollments.qbankId, qbankId));

    // Get active students (enrolled in last 30 days or accessed in last 7 days)
    const activeStudents = await db
      .select({ count: sql<number>`count(distinct ${qbankEnrollments.studentId})` })
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.qbankId, qbankId),
          sql`${qbankEnrollments.lastAccessedAt} > NOW() - INTERVAL '7 days' OR ${qbankEnrollments.enrolledAt} > NOW() - INTERVAL '30 days'`
        )
      );

    // Get total tests completed
    const testsCompleted = await db
      .select({ count: sql<number>`count(*)` })
      .from(qbankTestAttempts)
      .innerJoin(qbankEnrollments, eq(qbankTestAttempts.enrollmentId, qbankEnrollments.id))
      .where(
        and(
          eq(qbankEnrollments.qbankId, qbankId),
          eq(qbankTestAttempts.isCompleted, true)
        )
      );

    return NextResponse.json({
      totalEnrollments: Number(totalEnrollments[0]?.count) || 0,
      activeStudents: Number(activeStudents[0]?.count) || 0,
      testsCompleted: Number(testsCompleted[0]?.count) || 0,
    });
  } catch (error: any) {
    logger.error('Get admin analytics error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

