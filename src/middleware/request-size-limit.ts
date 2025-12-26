/**
 * Request Size Limiting Middleware
 * Prevents DoS attacks by limiting request body size
 */

import { NextRequest, NextResponse } from 'next/server';

// Size limits (in bytes)
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FORM_SIZE = 50 * 1024 * 1024; // 50MB (for file uploads)
const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * Check request size and reject if too large
 * Note: Middleware runs in Edge runtime, so we use sync checks only
 */
export function checkRequestSize(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type') || '';
  const contentLength = request.headers.get('content-length');
  
  if (!contentLength) {
    // No content-length header - allow but monitor
    return null;
  }
  
  const size = parseInt(contentLength, 10);
  
  if (isNaN(size)) {
    return null;
  }
  
  // Determine max size based on content type
  let maxSize: number;
  if (contentType.includes('application/json')) {
    maxSize = MAX_JSON_SIZE;
  } else if (contentType.includes('multipart/form-data')) {
    maxSize = MAX_FORM_SIZE;
  } else if (contentType.includes('text/')) {
    maxSize = MAX_TEXT_SIZE;
  } else {
    maxSize = MAX_JSON_SIZE; // Default
  }
  
  if (size > maxSize) {
    return NextResponse.json(
      {
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`,
          maxSize: maxSize,
          receivedSize: size,
        },
      },
      { status: 413 }
    );
  }
  
  return null;
}

/**
 * Validate request body size in API routes
 * Use this in API route handlers
 */
export async function validateRequestBodySize(
  request: NextRequest,
  maxSize: number = MAX_JSON_SIZE
): Promise<{ valid: boolean; error?: NextResponse }> {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      return {
        valid: false,
        error: NextResponse.json(
          {
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`,
            },
          },
          { status: 413 }
        ),
      };
    }
  }
  
  return { valid: true };
}

