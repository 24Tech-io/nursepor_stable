import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  questionBanks,
  qbankEnrollments,
  qbankAccessRequests,
  qbankQuestions,
  enrollments as courseEnrollmentsTable
} from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - List all Q-Banks with access status
export async function GET(request: NextRequest) {
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
    const db = await getDatabaseWithRetry();

    // Get all published Q-Banks with actual question counts
    let allQbanks: any[] = [];
    try {
      allQbanks = await db
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
          createdAt: questionBanks.createdAt,
          totalQuestions: count(qbankQuestions.id),
        })
        .from(questionBanks)
        .leftJoin(qbankQuestions, eq(questionBanks.id, qbankQuestions.questionBankId))
        .where(
          and(
            eq(questionBanks.status, 'published'),
            eq(questionBanks.isActive, true)
          )
        )
        .groupBy(questionBanks.id);
    } catch (err: any) {
      logger.warn('Could not fetch Q-Banks:', err.message);
      allQbanks = [];
    }

    // Get student's Q-Bank enrollments
    let qbankEnrollmentsList: any[] = [];
    try {
      qbankEnrollmentsList = await db
        .select({
          qbankId: qbankEnrollments.qbankId,
          enrolledAt: qbankEnrollments.enrolledAt,
          progress: qbankEnrollments.progress,
          readinessScore: qbankEnrollments.readinessScore,
        })
        .from(qbankEnrollments)
        .where(eq(qbankEnrollments.studentId, studentId));
    } catch (err: any) {
      logger.warn('Could not fetch Q-Bank enrollments:', err.message);
      qbankEnrollmentsList = [];
    }

    // Get student's access requests
    let requests: any[] = [];
    try {
      requests = await db
        .select({
          qbankId: qbankAccessRequests.qbankId,
          status: qbankAccessRequests.status,
          requestedAt: qbankAccessRequests.requestedAt,
        })
        .from(qbankAccessRequests)
        .where(
          and(
            eq(qbankAccessRequests.studentId, studentId),
            eq(qbankAccessRequests.status, 'pending')
          )
        );
    } catch (err: any) {
      logger.warn('Could not fetch Q-Bank access requests:', err.message);
      requests = [];
    }

    // Get course enrollments to check for course-linked Q-Banks
    let enrolledCourseIds: number[] = [];
    try {
      const courseEnrollments = await db
        .select({
          courseId: courseEnrollmentsTable.courseId,
        })
        .from(courseEnrollmentsTable)
        .where(eq(courseEnrollmentsTable.userId, studentId));

      enrolledCourseIds = courseEnrollments.map(e => e.courseId);
    } catch (enrollmentError: any) {
      logger.warn('Could not fetch course enrollments:', enrollmentError.message);
      enrolledCourseIds = [];
    }

    // Categorize Q-Banks (including locked ones)
    const enrolled: any[] = [];
    const requested: any[] = [];
    const available: any[] = [];
    const locked: any[] = [];

    for (const qbank of allQbanks) {
      const enrollment = qbankEnrollmentsList.find(e => e.qbankId === qbank.id);
      const request = requests.find(r => r.qbankId === qbank.id);

      // Check if course-linked and student is enrolled
      const hasCourseAccess = qbank.courseId && enrolledCourseIds.includes(qbank.courseId);

      // Determine access status correctly
      let accessStatus: 'enrolled' | 'requested' | 'available' | 'requestable' | 'locked';
      if (enrollment || hasCourseAccess) {
        accessStatus = 'enrolled';
      } else if (request) {
        accessStatus = 'requested';
      } else if (qbank.isPublic || qbank.isDefaultUnlocked) {
        accessStatus = 'available';
      } else if (qbank.isRequestable) {
        accessStatus = 'requestable';
      } else {
        accessStatus = 'locked';
      }

      const qbankData = {
        ...qbank,
        accessStatus,
        enrollment: enrollment || null,
        request: request || null,
      };

      // Categorize into arrays
      if (enrollment || hasCourseAccess) {
        enrolled.push(qbankData);
      } else if (request) {
        requested.push(qbankData);
      } else {
        // Check if accessible (public, default unlocked, or requestable)
        if (qbank.isPublic || qbank.isDefaultUnlocked) {
          available.push(qbankData);
        } else if (qbank.isRequestable) {
          available.push(qbankData); // Requestable Q-Banks go in available array but with 'requestable' status
        } else {
          // Published and active but not accessible - show as locked
          locked.push(qbankData);
        }
      }
    }

    return NextResponse.json({
      enrolled,
      requested,
      available,
      locked,
      total: allQbanks.length,
    });
  } catch (error: any) {
    logger.error('Get Q-Banks error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Q-Banks', error: error.message },
      { status: 500 }
    );
  }
}

