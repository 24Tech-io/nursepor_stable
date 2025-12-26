import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankAccessRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

// DELETE - Delete an orphaned Q-Bank access request
export async function DELETE(
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

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ message: 'Invalid request ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Check if request exists
    const existingRequest = await db
      .select()
      .from(qbankAccessRequests)
      .where(eq(qbankAccessRequests.id, requestId))
      .limit(1);

    if (existingRequest.length === 0) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    // Delete the request
    await db.delete(qbankAccessRequests).where(eq(qbankAccessRequests.id, requestId));

    log.info(`Deleted orphaned Q-Bank access request #${requestId}`);

    return NextResponse.json({
      message: 'Orphaned request deleted successfully',
      requestId,
    });
  } catch (error: any) {
    log.error('Delete Q-Bank request error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

