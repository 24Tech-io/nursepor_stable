import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankAccessRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { rejectQBankRequestSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// POST - Reject access request
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
    
    // Validate request body
    const bodyValidation = await extractAndValidate(request, rejectQBankRequestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { reason } = bodyValidation.data;
    
    // Sanitize rejection reason if provided
    const sanitizedReason = reason ? sanitizeString(reason, 500) : null;

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

    if (requestRecords[0].status !== 'pending') {
      return NextResponse.json({ message: 'Request is not pending' }, { status: 400 });
    }

    // Update request status
    await db
      .update(qbankAccessRequests)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: decoded.id,
        rejectionReason: sanitizedReason,
      })
      .where(eq(qbankAccessRequests.id, requestId));

    return NextResponse.json({ message: 'Request rejected successfully' });
  } catch (error: any) {
    log.error('Reject Q-Bank request error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

