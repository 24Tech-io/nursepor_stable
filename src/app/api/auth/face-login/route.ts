import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Face login has been disabled
export async function POST(request: NextRequest) {
  try {
    logger.info('Face login attempt (disabled endpoint)');
    return NextResponse.json(
      { message: 'Face login is disabled' },
      { status: 410 } // Gone
    );
  } catch (error: any) {
    logger.error('Face login error (disabled endpoint):', error);
    return NextResponse.json(
      { message: 'Face login is disabled' },
      { status: 410 }
    );
  }
}
