import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankAccessRequests, questionBanks, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET - List pending access requests
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    const db = await getDatabaseWithRetry();
    const url = new URL(request.url);
    const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'all']);
    const statusParam = url.searchParams.get('status') || 'pending';
    const statusFilter = allowedStatuses.has(statusParam) ? statusParam : 'pending';

    // Build base query
    let query = db
      .select({
        id: qbankAccessRequests.id,
        studentId: qbankAccessRequests.studentId,
        qbankId: qbankAccessRequests.qbankId,
        reason: qbankAccessRequests.reason,
        status: qbankAccessRequests.status,
        requestedAt: qbankAccessRequests.requestedAt,
        reviewedAt: qbankAccessRequests.reviewedAt,
        rejectionReason: qbankAccessRequests.rejectionReason,
        student: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        qbank: {
          id: questionBanks.id,
          name: questionBanks.name,
        },
      })
      .from(qbankAccessRequests)
      .innerJoin(users, eq(qbankAccessRequests.studentId, users.id))
      .innerJoin(questionBanks, eq(qbankAccessRequests.qbankId, questionBanks.id));

    if (statusFilter !== 'all') {
      query = query.where(eq(qbankAccessRequests.status, statusFilter));
    }

    const requestsData = await query.orderBy(desc(qbankAccessRequests.requestedAt));

    // Transform to flat structure expected by frontend
    // With innerJoin, student and qbank should always be present
    const requests = requestsData.map((req) => ({
      id: req.id,
      studentId: req.studentId,
      studentName: req.student?.name || `[User #${req.studentId}]`,
      studentEmail: req.student?.email || 'N/A',
      qbankId: req.qbankId,
      qbankName: req.qbank?.name || `[Q-Bank #${req.qbankId}]`,
      reason: req.reason,
      status: req.status,
      requestedAt: req.requestedAt?.toISOString() || new Date().toISOString(),
      isOrphaned: false, // With innerJoin, requests are never orphaned
    }));

    return NextResponse.json({ requests });
  } catch (error: any) {
    log.error('Get Q-Bank requests error', error);

    // If table is missing (e.g., migrations not applied), return empty list with message
    if (error?.cause?.code === '42P01' || error?.code === '42P01') {
      return NextResponse.json(
        { requests: [], message: 'qbank_access_requests table missing; please run migrations' },
        { status: 200 }
      );
    }

    return handleApiError(error, request.nextUrl.pathname);
  }
}
