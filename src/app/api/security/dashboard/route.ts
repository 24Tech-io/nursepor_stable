/**
 * Security Monitoring Dashboard API
 * Provides real-time security statistics and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { securityMonitor } from '@/lib/security-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get time range from query params (default: last hour)
    const url = new URL(request.url);
    const minutes = parseInt(url.searchParams.get('minutes') || '60', 10);

    // Get security statistics
    const stats = securityMonitor.getStatistics(minutes);

    // Get recent suspicious IPs
    const recentEvents = securityMonitor.getRecentEvents(minutes * 60 * 1000);
    const suspiciousIPs = Array.from(new Set(recentEvents.map((e) => e.ip)))
      .filter((ip) => securityMonitor.isIPSuspicious(ip))
      .map((ip) => ({
        ip,
        events: securityMonitor.getEventsByIP(ip).length,
        lastSeen: Math.max(
          ...securityMonitor.getEventsByIP(ip).map((e) => e.timestamp.getTime())
        ),
      }));

    return NextResponse.json({
      timeRange: `Last ${minutes} minutes`,
      statistics: stats,
      suspiciousIPs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Security dashboard error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

