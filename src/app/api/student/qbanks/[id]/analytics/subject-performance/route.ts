import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSubjectPerformance } from '@/lib/qbank-analytics';

// GET - Performance by subject/client need area
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

    const performance = await getSubjectPerformance(enrollment[0].id);

    // Group by subject
    const bySubject: any = {};
    const byClientNeedArea: any = {};

    for (const perf of performance) {
      // By subject
      if (perf.subject) {
        if (!bySubject[perf.subject]) {
          bySubject[perf.subject] = {
            subject: perf.subject,
            questionsAttempted: 0,
            questionsCorrect: 0,
            accuracyPercentage: 0,
            lessons: [],
          };
        }
        bySubject[perf.subject].questionsAttempted += perf.questionsAttempted;
        bySubject[perf.subject].questionsCorrect += perf.questionsCorrect;
        if (perf.lesson) {
          bySubject[perf.subject].lessons.push({
            lesson: perf.lesson,
            accuracyPercentage: perf.accuracyPercentage,
          });
        }
      }

      // By client need area
      if (perf.clientNeedArea) {
        if (!byClientNeedArea[perf.clientNeedArea]) {
          byClientNeedArea[perf.clientNeedArea] = {
            clientNeedArea: perf.clientNeedArea,
            questionsAttempted: 0,
            questionsCorrect: 0,
            accuracyPercentage: 0,
          };
        }
        byClientNeedArea[perf.clientNeedArea].questionsAttempted += perf.questionsAttempted;
        byClientNeedArea[perf.clientNeedArea].questionsCorrect += perf.questionsCorrect;
      }
    }

    // Calculate percentages
    for (const subject of Object.values(bySubject) as any[]) {
      subject.accuracyPercentage = subject.questionsAttempted > 0
        ? (subject.questionsCorrect / subject.questionsAttempted) * 100
        : 0;
    }

    for (const area of Object.values(byClientNeedArea) as any[]) {
      area.accuracyPercentage = area.questionsAttempted > 0
        ? (area.questionsCorrect / area.questionsAttempted) * 100
        : 0;
    }

    return NextResponse.json({
      bySubject: Object.values(bySubject),
      byClientNeedArea: Object.values(byClientNeedArea),
      detailed: performance,
    });
  } catch (error: any) {
    logger.error('Get subject performance error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch subject performance', error: error.message },
      { status: 500 }
    );
  }
}

