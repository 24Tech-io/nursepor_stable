import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCategoryPerformance } from '@/lib/qbank-analytics';

// GET - Performance breakdown by category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const studentId = auth.user.id;
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

    const performance = await getCategoryPerformance(enrollment[0].id);

    return NextResponse.json({ performance });
  } catch (error: any) {
    logger.error('Get category performance error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch category performance', error: error.message },
      { status: 500 }
    );
  }
}

