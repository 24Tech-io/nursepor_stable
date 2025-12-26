/**
 * Development-only endpoint to reset rate limits
 * Only works in development mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAllRateLimits } from '@/lib/security-middleware';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    clearAllRateLimits();
    return NextResponse.json({
      success: true,
      message: 'Rate limits cleared successfully',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear rate limits' }, { status: 500 });
  }
}
