import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Input validation and sanitization
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().slice(0, maxLength).replace(/[<>]/g, ''); // Basic XSS prevention
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  // Minimum length
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  
  // Require uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Require lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Require number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  // Require special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
  }
  
  return { valid: true };
}

export function validatePhone(phone: string): boolean {
  // Basic phone validation - adjust regex for your needs
  const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
  return phoneRegex.test(phone);
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Rate limiting
export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Get client IP for rate limiting
// Handles AWS Amplify/CloudFront, proxies, and direct connections
export function getClientIP(request: NextRequest): string {
  // AWS Amplify/CloudFront specific headers
  const cloudFrontViewer = request.headers.get('cloudfront-viewer-address');
  if (cloudFrontViewer) {
    // Format: "IP:PORT" - extract just the IP
    const ip = cloudFrontViewer.split(':')[0]?.trim();
    if (ip) return ip;
  }
  
  // Check for CloudFront-Viewer-Address (alternative header name)
  const cfViewer = request.headers.get('CloudFront-Viewer-Address');
  if (cfViewer) {
    const ip = cfViewer.split(':')[0]?.trim();
    if (ip) return ip;
  }
  
  // Standard proxy headers (x-forwarded-for can contain multiple IPs)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP (client IP) from the chain
    const firstIP = forwarded.split(',')[0]?.trim();
    if (firstIP && firstIP !== 'unknown') return firstIP;
  }
  
  // Real IP header (some proxies use this)
  const realIP = request.headers.get('x-real-ip');
  if (realIP && realIP !== 'unknown') return realIP.trim();
  
  // Fallback to Next.js request IP
  if (request.ip && request.ip !== 'unknown') return request.ip;
  
  // Last resort: use 'unknown' but log a warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Could not determine client IP, using "unknown"', {
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'x-real-ip': request.headers.get('x-real-ip'),
        'cloudfront-viewer-address': request.headers.get('cloudfront-viewer-address'),
        'CloudFront-Viewer-Address': request.headers.get('CloudFront-Viewer-Address'),
      },
      requestIp: request.ip,
    });
  }
  
  return 'unknown';
}

// XSS protection - escape HTML
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Validate request body size
export function validateBodySize(body: string, maxSize: number = 1024 * 1024): boolean {
  return Buffer.byteLength(body, 'utf8') <= maxSize;
}

// Check if string contains SQL injection patterns
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/|;)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\bUNION\s+SELECT\b)/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(input));
}

// Sanitize for SQL (though we use ORM, this is extra protection)
export function sanitizeForSQL(input: string): string {
  if (containsSQLInjection(input)) {
    throw new Error('Invalid input detected');
  }
  return input;
}
