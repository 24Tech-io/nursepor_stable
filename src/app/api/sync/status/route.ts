import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getSyncStatus } from '@/lib/sync-service';

/**
 * Sync Status Endpoint
 * Returns current sync status for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const status = await getSyncStatus();

    if (!status) {
      return NextResponse.json(
        { message: 'Failed to get sync status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Sync status retrieved successfully',
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to get sync status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}











