/**
 * Enhanced Security Utilities
 * Implements CIA Triad: Confidentiality, Integrity, Availability
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// CONFIDENTIALITY - Data Protection
// ============================================

/**
 * Encrypt sensitive data (for storage)
 */
export function encryptData(data: string, secret: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(secret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, secret: string): string {
  const algorithm = 'aes-256-gcm';
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const key = crypto.scryptSync(secret, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ============================================
// INTEGRITY - Data Validation & Protection
// ============================================

/**
 * Generate HMAC for data integrity verification
 */
export function generateHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC
 */
export function verifyHMAC(data: string, hmac: string, secret: string): boolean {
  const expectedHMAC = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(expectedHMAC)
  );
}

/**
 * Enhanced input sanitization
 */
export function sanitizeInput(input: any, type: 'string' | 'number' | 'email' | 'url' = 'string'): any {
  if (input === null || input === undefined) {
    return null;
  }

  if (type === 'string') {
    if (typeof input !== 'string') {
      return '';
    }
    // Remove null bytes, trim, and limit length
    return input
      .replace(/\0/g, '')
      .trim()
      .slice(0, 10000)
      .replace(/[<>]/g, ''); // Basic XSS prevention
  }

  if (type === 'number') {
    const num = Number(input);
    return isNaN(num) ? 0 : num;
  }

  if (type === 'email') {
    if (typeof input !== 'string') {
      return '';
    }
    const email = input.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : '';
  }

  if (type === 'url') {
    if (typeof input !== 'string') {
      return '';
    }
    try {
      const url = new URL(input);
      // Only allow http/https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return '';
    } catch {
      return '';
    }
  }

  return input;
}

/**
 * Validate and sanitize request body
 */
export function validateRequestBody<T extends Record<string, any>>(
  body: any,
  schema: Record<keyof T, 'string' | 'number' | 'email' | 'url' | 'boolean'>
): Partial<T> {
  const validated: Partial<T> = {};

  for (const [key, type] of Object.entries(schema)) {
    if (body[key] !== undefined) {
      if (type === 'boolean') {
        validated[key as keyof T] = Boolean(body[key]) as T[keyof T];
      } else {
        validated[key as keyof T] = sanitizeInput(body[key], type as any) as T[keyof T];
      }
    }
  }

  return validated;
}

/**
 * CSRF Token generation and verification
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  csrfTokens.set(sessionId, { token, expiresAt });

  // Cleanup expired tokens
  for (const [sid, data] of csrfTokens.entries()) {
    if (Date.now() > data.expiresAt) {
      csrfTokens.delete(sid);
    }
  }

  return token;
}

export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(stored.token)
  );
}

// ============================================
// AVAILABILITY - Rate Limiting & Protection
// ============================================

/**
 * Enhanced rate limiting with sliding window
 */
const rateLimitStore = new Map<string, { requests: number[]; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, {
      requests: [now],
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Remove requests outside the window
  const windowStart = now - windowMs;
  record.requests = record.requests.filter((time) => time > windowStart);

  if (record.requests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.requests.push(now);
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.requests.length,
    resetTime: record.resetTime,
  };
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest): string {
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Combine IP and user agent for better identification
  return `${ip}:${hashData(userAgent).slice(0, 8)}`;
}

// ============================================
// Security Headers Helper
// ============================================

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return response;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0-4
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    score++;
  }

  if (password.length >= 12) {
    score++;
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  }

  return {
    valid: errors.length === 0 && score >= 3,
    score: Math.min(score, 4),
    errors,
  };
}

