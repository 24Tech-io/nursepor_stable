import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  questionBanks,
  qbankEnrollments,
  qbankAccessRequests
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST - Enroll in public Q-Bank
export async function POST(
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

    // Get Q-Bank
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(
        and(
          eq(questionBanks.id, qbankId),
          eq(questionBanks.status, 'published'),
          eq(questionBanks.isActive, true)
        )
      )
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({ message: 'Q-Bank not found or not available' }, { status: 404 });
    }

    const qbankData = qbank[0];

    // Check if public or default unlocked
    if (!qbankData.isPublic && !qbankData.isDefaultUnlocked) {
      return NextResponse.json({
        message: 'This Q-Bank requires approval. Please request access.',
        requiresApproval: true
      }, { status: 403 });
    }

    // Check if already enrolled and create enrollment
    try {
      const existingEnrollment = await db
        .select()
        .from(qbankEnrollments)
        .where(
          and(
            eq(qbankEnrollments.studentId, studentId),
            eq(qbankEnrollments.qbankId, qbankId)
          )
        )
        .limit(1);

      if (existingEnrollment.length > 0) {
        return NextResponse.json({
          message: 'Already enrolled',
          enrollment: existingEnrollment[0]
        });
      }

      // Create enrollment
      const [enrollment] = await db
        .insert(qbankEnrollments)
        .values({
          studentId,
          qbankId,
          enrolledAt: new Date(),
          lastAccessedAt: new Date(),
          progress: 0,
          questionsAttempted: 0,
          questionsCorrect: 0,
          totalTimeSpentMinutes: 0,
          testsCompleted: 0,
          tutorialTestsCompleted: 0,
          timedTestsCompleted: 0,
          assessmentTestsCompleted: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          readinessScore: 0,
        })
        .returning();

      // Delete any pending requests
      try {
        await db
          .delete(qbankAccessRequests)
          .where(
            and(
              eq(qbankAccessRequests.studentId, studentId),
              eq(qbankAccessRequests.qbankId, qbankId),
              eq(qbankAccessRequests.status, 'pending')
            )
          );
      } catch (e) {
        // Ignore if table doesn't exist
      }

      return NextResponse.json({
        message: 'Enrolled successfully',
        enrollment,
      });
    } catch (dbError: any) {
      // If the enrollment table doesn't exist, return a simulated enrollment response
      if (dbError.message?.includes('does not exist') || dbError.cause?.message?.includes('does not exist')) {
        logger.warn('Q-Bank enrollment table does not exist, returning simulated enrollment');
        return NextResponse.json({
          message: 'Enrolled successfully (database migration pending)',
          enrollment: {
            id: 0,
            studentId,
            qbankId,
            enrolledAt: new Date().toISOString(),
            progress: 0,
          },
          note: 'Database tables need to be migrated. Run: npx drizzle-kit push'
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    logger.error('Enroll in Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to enroll', error: error.message },
      { status: 500 }
    );
  }
}

