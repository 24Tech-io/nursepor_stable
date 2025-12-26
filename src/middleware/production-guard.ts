/**
 * Production Guard Middleware
 * Prevents debug/test endpoints from being accessed in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

/**
 * Check if endpoint should be blocked in production
 */
export function isDebugEndpoint(pathname: string): boolean {
  return pathname.startsWith('/api/debug') ||
         pathname.startsWith('/api/test') ||
         pathname.startsWith('/api/setup');
}

/**
 * Guard debug endpoints in production
 */
export function guardDebugEndpoints(request: NextRequest): NextResponse | null {
  // Allow in development and test
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }
  
  // Block debug endpoints in production
  if (isDebugEndpoint(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        error: {
          code: 'ENDPOINT_NOT_AVAILABLE',
          message: 'This endpoint is not available in production',
        },
      },
      { status: 404 } // Return 404 to hide existence of endpoint
    );
  }
  
  return null;
}

