/**
 * Development Security Status API
 * View current security status and statistics
 * ONLY AVAILABLE IN DEVELOPMENT MODE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBlockedIPs, getSuspiciousIPs } from '@/lib/threat-detection';
import { getBlockedIPs as getBruteForceBlocked } from '@/lib/brute-force-protection';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const blockedIPs = getBlockedIPs();
    const suspiciousIPs = getSuspiciousIPs();
    const bruteForceBlocked = getBruteForceBlocked();

    return NextResponse.json({
      security: {
        threatDetection: {
          blockedIPs: blockedIPs.length,
          suspiciousIPs: suspiciousIPs.length,
          blocked: blockedIPs,
          suspicious: suspiciousIPs.slice(0, 10), // Top 10
        },
        bruteForceProtection: {
          blockedIPs: bruteForceBlocked.length,
          blocked: bruteForceBlocked,
        },
        status: {
          csrfProtection: 'Active',
          bruteForceProtection: 'Active',
          threatDetection: 'Active',
          inputValidation: 'Active',
          rateLimiting: 'Active',
          securityHeaders: 'Active',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve security status' },
      { status: 500 }
    );
  }
}

