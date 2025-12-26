/**
 * Internal Performance Statistics Endpoint
 * Provides performance metrics for monitoring and optimization
 * Should be protected in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceSummary, resetMetrics } from '@/lib/performance-monitor';
import { getCacheStats } from '@/lib/api-cache';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Protect this endpoint - require admin authentication
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Check for reset parameter
    const { searchParams } = new URL(request.url);
    const shouldReset = searchParams.get('reset') === 'true';

    if (shouldReset) {
      resetMetrics();
      return NextResponse.json({ message: 'Metrics reset successfully' });
    }

    // Get performance summary
    const performanceSummary = getPerformanceSummary();
    const cacheStats = getCacheStats();

    return NextResponse.json({
      performance: performanceSummary,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to get performance stats',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

