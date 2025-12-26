import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  questionBanks,
  qbankEnrollments,
  qbankAccessRequests,
  qbankQuestions,
  enrollments
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Get Q-Bank details and enrollment info
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

    // Get Q-Bank details
    const qbank = await db
      .select({
        id: questionBanks.id,
        name: questionBanks.name,
        description: questionBanks.description,
        instructor: questionBanks.instructor,
        thumbnail: questionBanks.thumbnail,
        pricing: questionBanks.pricing,
        status: questionBanks.status,
        courseId: questionBanks.courseId,
        isRequestable: questionBanks.isRequestable,
        isPublic: questionBanks.isPublic,
        isDefaultUnlocked: questionBanks.isDefaultUnlocked,
        totalQuestions: questionBanks.totalQuestions,
        createdAt: questionBanks.createdAt,
      })
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    const qbankData = qbank[0];

    // Check enrollment
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

    // Check if course-linked and student is enrolled
    let hasCourseAccess = false;
    if (qbankData.courseId) {
      try {
        const courseEnrollment = await db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, studentId),
              eq(enrollments.courseId, qbankData.courseId)
            )
          )
          .limit(1);
        hasCourseAccess = courseEnrollment.length > 0;
      } catch (enrollmentError: any) {
        // If enrollments table doesn't exist, assume no course access
        logger.warn('Could not check course enrollment:', enrollmentError.message);
        hasCourseAccess = false;
      }
    }

    // Check pending request
    const pendingRequest = await db
      .select()
      .from(qbankAccessRequests)
      .where(
        and(
          eq(qbankAccessRequests.studentId, studentId),
          eq(qbankAccessRequests.qbankId, qbankId),
          eq(qbankAccessRequests.status, 'pending')
        )
      )
      .limit(1);

    // Get question count
    const questionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId));

    const totalQuestions = questionCount[0]?.count || 0;

    // Determine access status
    let accessStatus = 'none';
    if (enrollment.length > 0 || hasCourseAccess) {
      accessStatus = 'enrolled';
    } else if (pendingRequest.length > 0) {
      accessStatus = 'requested';
    } else if (qbankData.isPublic || qbankData.isDefaultUnlocked) {
      accessStatus = 'available';
    } else if (qbankData.isRequestable) {
      accessStatus = 'requestable';
    }

    return NextResponse.json({
      qbank: {
        ...qbankData,
        totalQuestions,
      },
      enrollment: enrollment[0] || null,
      request: pendingRequest[0] || null,
      accessStatus,
      hasAccess: accessStatus === 'enrolled',
    });
  } catch (error: any) {
    logger.error('Get Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Q-Bank', error: error.message },
      { status: 500 }
    );
  }
}

