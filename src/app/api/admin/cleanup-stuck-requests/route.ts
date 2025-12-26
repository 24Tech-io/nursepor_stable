import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { accessRequests } from '@/lib/db/schema';
import { eq, and, isNotNull, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Cleanup Stuck Requests API
 * Fixes requests where reviewedAt is set but status is still pending
 * This can happen if a request was processed but the status wasn't updated properly
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    // Find all requests where reviewedAt is set but status is still pending
    const stuckRequests = await db
      .select()
      .from(accessRequests)
      .where(and(isNotNull(accessRequests.reviewedAt), eq(accessRequests.status, 'pending')));

    logger.info(`🔍 Found ${stuckRequests.length} stuck requests to clean up`);

    // Delete all stuck requests (they should have been deleted after processing)
    let deletedCount = 0;
    for (const request of stuckRequests) {
      try {
        await db.delete(accessRequests).where(eq(accessRequests.id, request.id));
        deletedCount++;
        logger.info(`✅ Deleted stuck request #${request.id} (reviewedAt: ${request.reviewedAt}, status: ${request.status})`);
      } catch (error: any) {
        logger.error(`❌ Failed to delete stuck request #${request.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Cleaned up ${deletedCount} stuck requests`,
      deletedCount,
      totalFound: stuckRequests.length,
    });
  } catch (error: any) {
    logger.error('❌ Cleanup stuck requests error:', error);
    return NextResponse.json(
      {
        message: 'Failed to cleanup stuck requests',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




