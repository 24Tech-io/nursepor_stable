/**
 * Development Unblock IP API
 * Manually unblock IPs for testing
 * ONLY AVAILABLE IN DEVELOPMENT MODE
 */

import { NextRequest, NextResponse } from 'next/server';
import { unblockIP as unblockThreatIP } from '@/lib/threat-detection';
import { unblockIP as unblockBruteForceIP } from '@/lib/brute-force-protection';
import { extractAndValidate } from '@/lib/api-validation';
import { unblockIPSchema } from '@/lib/validation-schemas-extended';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Validate request body
    const bodyValidation = await extractAndValidate(request, unblockIPSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { ip } = bodyValidation.data;

    // Unblock from both systems
    unblockThreatIP(ip);
    unblockBruteForceIP(ip);

    return NextResponse.json({
      success: true,
      message: `IP ${ip} has been unblocked`,
    });
  } catch (error: any) {
    logger.error('Unblock IP error:', error);
    return NextResponse.json(
      { error: 'Failed to unblock IP' },
      { status: 500 }
    );
  }
}
