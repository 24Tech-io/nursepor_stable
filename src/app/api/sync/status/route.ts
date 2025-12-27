import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getSyncStatus } from '@/lib/sync-service';

/**
 * Sync Status Endpoint
 * Returns current sync status for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    const { user: decoded } = auth;

    const status = await getSyncStatus();

    if (!status) {
      return NextResponse.json({ message: 'Failed to get sync status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Sync status retrieved successfully',
    });
  } catch (error: any) {
    logger.error('Sync status error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get sync status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




