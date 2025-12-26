import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankAccessRequests, qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';

export const dynamic = 'force-dynamic';

// POST - Approve access request → Create enrollment
export async function POST(
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

    // Sanitize and validate request ID
    const sanitizedId = sanitizeString(params.id, 20);
    const requestId = parseInt(sanitizedId);
    
    if (isNaN(requestId) || requestId <= 0) {
      return NextResponse.json({ message: 'Invalid request ID' }, { status: 400 });
    }
    
    const db = await getDatabaseWithRetry();

    // Get request
    const requestRecords = await db
      .select()
      .from(qbankAccessRequests)
      .where(eq(qbankAccessRequests.id, requestId))
      .limit(1);

    if (requestRecords.length === 0) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const requestData = requestRecords[0];

    if (requestData.status !== 'pending') {
      return NextResponse.json({ message: 'Request is not pending' }, { status: 400 });
    }

    // Check if already enrolled
    const existingEnrollment = await db
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, requestData.studentId),
          eq(qbankEnrollments.qbankId, requestData.qbankId)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      // Just update request status
      await db
        .update(qbankAccessRequests)
        .set({
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: decoded.id,
        })
        .where(eq(qbankAccessRequests.id, requestId));

      return NextResponse.json({ message: 'Request approved (already enrolled)', enrollment: existingEnrollment[0] });
    }

    // Create enrollment
    const [enrollment] = await db
      .insert(qbankEnrollments)
      .values({
        studentId: requestData.studentId,
        qbankId: requestData.qbankId,
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

    // Update request status
    await db
      .update(qbankAccessRequests)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: decoded.id,
      })
      .where(eq(qbankAccessRequests.id, requestId));

    return NextResponse.json({
      message: 'Request approved and enrollment created',
      enrollment,
    });
  } catch (error: any) {
    log.error('Approve Q-Bank request error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

