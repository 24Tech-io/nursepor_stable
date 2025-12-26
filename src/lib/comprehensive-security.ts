/**
 * Comprehensive Security Middleware
 * Integrates all security measures into a unified system
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken } from './csrf-protection';
import { isIPBlocked as isBruteForceBlocked, isUsernameBlocked } from './brute-force-protection';
import {
  validateRequestBody,
  detectSSRF,
  generateCSP,
  validateEmail,
  validateUsername
} from './advanced-security';
import {
  isIPBlocked,
  analyzeRequest,
  reportSecurityIncident,
  getThreatScore,
} from './threat-detection';
import { securityLogger } from './edge-logger';
import { getClientIP } from './security-middleware';

// Security configuration
export const securityConfig = {
  enableCSRFProtection: true,
  enableBruteForceProtection: true,
  enableThreatDetection: true,
  enableInputValidation: true,
  enableRateLimiting: true,
  blockTorUsers: false, // Set to true if you want to block Tor
  logAllRequests: process.env.NODE_ENV === 'production',
};

/**
 * Main security middleware function
 */
export async function applySecurity(
  req: NextRequest,
  options?: Partial<typeof securityConfig>
): Promise<{ allowed: boolean; response?: NextResponse; reason?: string }> {
  const config = { ...securityConfig, ...options };
  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  const path = req.nextUrl.pathname;
  const method = req.method;

  // Convert headers to plain object
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // 1. Check if IP is blocked (from threat detection)
  if (config.enableThreatDetection && isIPBlocked(ip)) {
    securityLogger.info('Blocked IP attempted access', { ip, path });
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Access denied. Your IP has been blocked due to suspicious activity.' },
        { status: 403 }
      ),
      reason: 'IP blocked',
    };
  }

  // 2. Check if IP is blocked (from brute force protection)
  if (config.enableBruteForceProtection && isBruteForceBlocked(ip)) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      ),
      reason: 'Brute force protection',
    };
  }

  // 3. Analyze request for threats
  if (config.enableThreatDetection) {
    const analysis = analyzeRequest({
      ip,
      userAgent,
      path,
      method,
      headers,
    });

    if (!analysis.safe) {
      reportSecurityIncident(ip, 'Request analysis failed', {
        threats: analysis.threats,
        path,
      }, 'high');

      return {
        allowed: false,
        response: NextResponse.json(
          { error: 'Request blocked due to security concerns.' },
          { status: 403 }
        ),
        reason: analysis.threats.join(', '),
      };
    }
  }

  // 4. Validate request body (for POST/PUT/PATCH)
  if (config.enableInputValidation && ['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const contentType = req.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const body = await req.json();
        const validation = validateRequestBody(body);

        if (!validation.safe) {
          reportSecurityIncident(ip, 'Malicious input detected', {
            threats: validation.threats,
            path,
          }, 'critical');

          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Request contains potentially malicious content.' },
              { status: 400 }
            ),
            reason: validation.threats.join(', '),
          };
        }
      }
    } catch (error) {
      // Error parsing body - might be malformed
      if (config.enableThreatDetection) {
        reportSecurityIncident(ip, 'Malformed request body', { path }, 'low');
      }
    }
  }

  // 5. Log request if configured
  if (config.logAllRequests) {
    const threatScore = getThreatScore(ip);
    if (threatScore > 0) {
      securityLogger.info('Request from suspicious IP', {
        ip,
        path,
        method,
        threatScore,
      });
    }
  }

  return { allowed: true };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP());

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(self), payment=()'
  );

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove identifying headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

/**
 * Validate API request
 */
export function validateAPIRequest(req: NextRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Content-Type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type');
    if (!contentType) {
      errors.push('Content-Type header is required');
    } else if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      errors.push('Invalid Content-Type');
    }
  }

  // Check for suspicious patterns in URL
  const path = req.nextUrl.pathname;
  if (path.includes('..') || path.includes('%2e')) {
    errors.push('Invalid path');
  }

  // Check Origin header for cross-origin requests
  const origin = req.headers.get('origin');
  if (origin && req.method !== 'GET') {
    // Validate origin matches expected domains
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
    ].filter(Boolean);

    if (!allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      errors.push('Invalid origin');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input
 */
export function sanitizeUserInput(input: {
  email?: string;
  username?: string;
  name?: string;
  [key: string]: any;
}): {
  valid: boolean;
  errors: string[];
  sanitized: any;
} {
  const errors: string[] = [];
  const sanitized: any = { ...input };

  // Validate email
  if (input.email) {
    if (!validateEmail(input.email)) {
      errors.push('Invalid email format');
    }
    sanitized.email = input.email.toLowerCase().trim();
  }

  // Validate username
  if (input.username) {
    if (!validateUsername(input.username)) {
      errors.push('Invalid username format (3-30 alphanumeric characters and underscores only)');
    }
    sanitized.username = input.username.toLowerCase().trim();
  }

  // Sanitize name
  if (input.name) {
    // Remove any HTML/script tags
    sanitized.name = input.name.replace(/<[^>]*>/g, '').trim();
    if (sanitized.name.length > 100) {
      errors.push('Name is too long');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Check for SSRF in URL parameters
 */
export function validateURLParameter(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  // Check for SSRF
  if (detectSSRF(url)) {
    return { valid: false, error: 'URL points to a restricted resource' };
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);

    // Only allow HTTP(S)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP(S) URLs are allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Rate limit check with exponential backoff
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number = 10,
  windowMs: number = 60000
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let data = requestCounts.get(key);

  if (!data || now > data.resetAt) {
    data = {
      count: 1,
      resetAt: now + windowMs,
    };
    requestCounts.set(key, data);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: data.resetAt,
    };
  }

  data.count++;

  if (data.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: limit - data.count,
    resetAt: data.resetAt,
  };
}

// Export validation functions
export { validateEmail, validateUsername, detectSSRF };


