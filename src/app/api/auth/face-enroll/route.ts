import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Face enrollment has been disabled
export async function POST(request: NextRequest) {
  try {
    logger.info('Face enrollment attempt (disabled endpoint)');
    return NextResponse.json(
      { message: 'Face enrollment is disabled' },
      { status: 410 } // Gone
    );
  } catch (error: any) {
    logger.error('Face enrollment error (disabled endpoint):', error);
    return NextResponse.json(
      { message: 'Face enrollment is disabled' },
      { status: 410 }
    );
  }
}
