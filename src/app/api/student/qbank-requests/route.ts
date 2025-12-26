import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankAccessRequests,
  questionBanks,
  qbankEnrollments
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createQBankRequestSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET - List student's access requests
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

    const requests = await db
      .select({
        id: qbankAccessRequests.id,
        qbankId: qbankAccessRequests.qbankId,
        reason: qbankAccessRequests.reason,
        status: qbankAccessRequests.status,
        requestedAt: qbankAccessRequests.requestedAt,
        reviewedAt: qbankAccessRequests.reviewedAt,
        rejectionReason: qbankAccessRequests.rejectionReason,
        qbank: {
          id: questionBanks.id,
          name: questionBanks.name,
          description: questionBanks.description,
          instructor: questionBanks.instructor,
          thumbnail: questionBanks.thumbnail,
        },
      })
      .from(qbankAccessRequests)
      .innerJoin(questionBanks, eq(qbankAccessRequests.qbankId, questionBanks.id))
      .where(eq(qbankAccessRequests.studentId, studentId))
      .orderBy(desc(qbankAccessRequests.requestedAt));

    return NextResponse.json({ requests });
  } catch (error: any) {
    logger.error('Get Q-Bank requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Request access to Q-Bank
export async function POST(request: NextRequest) {
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

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createQBankRequestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { qbankId, reason } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // Check if Q-Bank exists and is requestable
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
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    if (!qbank[0].isRequestable) {
      return NextResponse.json({ message: 'This Q-Bank does not accept access requests' }, { status: 403 });
    }

    // Check if already enrolled (shouldn't happen, but check anyway)
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
      return NextResponse.json({ message: 'Already enrolled in this Q-Bank' }, { status: 400 });
    }

    // Check if request already exists
    const existingRequest = await db
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

    if (existingRequest.length > 0) {
      return NextResponse.json({ message: 'Request already pending' }, { status: 400 });
    }

    // Create request
    const [newRequest] = await db
      .insert(qbankAccessRequests)
      .values({
        studentId,
        qbankId,
        reason: reason || null,
        status: 'pending',
        requestedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      message: 'Access request submitted successfully',
      request: newRequest,
    });
  } catch (error: any) {
    logger.error('Create Q-Bank request error:', error);
    return NextResponse.json(
      { message: 'Failed to create request', error: error.message },
      { status: 500 }
    );
  }
}

