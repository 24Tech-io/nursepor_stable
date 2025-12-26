import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { performSyncCheck } from '@/lib/sync-service';

/**
 * Sync Check Endpoint
 * Performs comprehensive sync check and returns results
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const result = await performSyncCheck();

    return NextResponse.json({
      ...result,
      message: result.success 
        ? 'Sync check completed successfully' 
        : 'Sync check failed',
    });
  } catch (error: any) {
    logger.error('Sync check error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to perform sync check',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}











