/**
 * CSRF Token API
 * Generates CSRF tokens for authenticated users
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf-protection';
import { verifyToken } from '@/lib/auth';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const token =
      request.cookies.get('student_token')?.value ||
      request.cookies.get('admin_token')?.value ||
      request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify session
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }
    
    // Generate CSRF token using user ID as session ID
    const csrfToken = generateCSRFToken(user.id.toString());
    
    return NextResponse.json({
      csrfToken,
    });
  } catch (error: any) {
    log.error('CSRF token generation error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

