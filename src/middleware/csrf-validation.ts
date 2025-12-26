/**
 * CSRF Token Validation Middleware
 * Validates CSRF tokens for state-changing operations (POST, PUT, DELETE, PATCH)
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from '@/lib/edge-logger';

/**
 * Check if CSRF validation is required for this request
 */
function requiresCSRFValidation(request: NextRequest): boolean {
  const method = request.method;
  const pathname = request.nextUrl.pathname;

  // Only validate state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return false;
  }

  // Skip CSRF validation for:
  // - Public endpoints (login, register, etc.)
  // - Webhook endpoints (Stripe, etc.)
  // - Health checks
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/admin-login',
    '/api/auth/register',
    '/api/auth/admin-register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/send-otp',
    '/api/auth/verify-otp',
    '/api/health',
    '/api/payments/webhook', // Stripe webhook
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return false;
  }

  return true;
}

/**
 * Validate CSRF token for a request
 * Returns null if validation passes, or a NextResponse with error if it fails
 * 
 * Note: In Edge runtime, CSRF validation is deferred to API routes
 * This middleware only checks for token presence, not validation
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  // Check if CSRF validation is required
  if (!requiresCSRFValidation(request)) {
    return null; // No validation needed
  }

  try {
    const origin = request.headers.get('origin');
    const isCrossSite = !!origin && origin !== request.nextUrl.origin;

    // Only enforce CSRF checks for cross-site requests.
    // This prevents accidental breakage of same-origin app requests while still protecting
    // against classic CSRF attacks originating from a different site.
    if (!isCrossSite) {
      return null;
    }

    // Get session token from cookie
    const token =
      request.cookies.get('student_token')?.value ||
      request.cookies.get('admin_token')?.value ||
      request.cookies.get('token')?.value;
    
    if (!token) {
      // No session token - CSRF validation not applicable
      // (authentication middleware will handle this)
      return null;
    }

    // In Edge runtime, we can't use Node.js crypto for CSRF validation
    // So we only check for token presence here
    // Actual validation happens in API routes where Node.js crypto is available
    const csrfToken = request.headers.get('X-CSRF-Token') || 
                      request.headers.get('x-csrf-token');

    if (!csrfToken) {
      securityLogger.warn('CSRF token missing', {
        path: request.nextUrl.pathname,
        method: request.method,
      });
      return NextResponse.json(
        {
          error: 'CSRF token required',
          message: 'Please include X-CSRF-Token header',
        },
        { status: 403 }
      );
    }

    // Token is present - actual validation happens in API route
    // This allows Edge runtime to work while still enforcing CSRF token presence
    return null;
  } catch (error: any) {
    // Log error but don't block request (fail open for now)
    // In production, you might want to fail closed
    securityLogger.error('CSRF validation error', {
      error: error.message,
      path: request.nextUrl.pathname,
    });
    return null; // Fail open - let other middleware handle
  }
}

