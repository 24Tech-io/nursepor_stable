/**
 * Request Body Size Middleware
 * Prevents DoS attacks via large request payloads
 */

import { NextRequest, NextResponse } from 'next/server';

// Maximum request body size (10MB by default)
const MAX_BODY_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10);

// Routes that allow larger payloads (e.g., file uploads)
const LARGE_PAYLOAD_ROUTES = [
  '/api/profile/upload-picture',
  '/api/admin/courses',
  '/api/payments/webhook', // Stripe webhooks can be large
];

/**
 * Check request body size
 */
export function checkRequestSize(
  req: NextRequest,
  maxSize: number = MAX_BODY_SIZE
): {
  allowed: boolean;
  size?: number;
  error?: string;
} {
  const contentLength = req.headers.get('content-length');

  // If no content-length header, we can't check size
  // Allow it but monitor
  if (!contentLength) {
    return { allowed: true };
  }

  const size = parseInt(contentLength, 10);

  // Check if size exceeds limit
  if (size > maxSize) {
    return {
      allowed: false,
      size,
      error: `Request body too large. Maximum allowed: ${formatBytes(maxSize)}, received: ${formatBytes(size)}`,
    };
  }

  return { allowed: true, size };
}

/**
 * Get appropriate max size for a route
 */
export function getMaxSizeForRoute(pathname: string): number {
  // Check if route allows larger payloads
  if (LARGE_PAYLOAD_ROUTES.some((route) => pathname.startsWith(route))) {
    // Allow up to 50MB for file uploads
    return 50 * 1024 * 1024;
  }

  // Default max size
  return MAX_BODY_SIZE;
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Apply request size check to middleware
 */
export function applyRequestSizeCheck(req: NextRequest): NextResponse | null {
  // Only check POST, PUT, PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return null;
  }

  const maxSize = getMaxSizeForRoute(req.nextUrl.pathname);
  const sizeCheck = checkRequestSize(req, maxSize);

  if (!sizeCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Request body too large',
        message: sizeCheck.error,
        maxSize: formatBytes(maxSize),
      },
      { status: 413 }
    );
  }

  return null;
}

