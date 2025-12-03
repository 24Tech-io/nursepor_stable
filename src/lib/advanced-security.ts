/**
 * Advanced Security Utilities
 * Comprehensive protection against various attack vectors
 */

import crypto from 'crypto';

// ============= Input Validation & Sanitization =============

/**
 * Comprehensive XSS prevention
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove all HTML tags
 */
export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Advanced SQL injection detection
 */
export function detectAdvancedSQLInjection(input: string): boolean {
  const sqlPatterns = [
    // Basic SQL keywords
    /(\bor\b|\band\b)\s*['"]?\s*\w+\s*['"]?\s*=\s*['"]?\w+/i,
    /union\s+(all\s+)?select/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /update\s+.*\s+set/i,
    /delete\s+from/i,
    /drop\s+(table|database|schema)/i,
    /create\s+(table|database|schema)/i,
    /alter\s+table/i,
    /truncate\s+table/i,

    // SQL comments
    /--/,
    /\/\*.*\*\//,
    /#/,

    // SQL functions
    /exec(\s|\+)+(s|x)p\w+/i,
    /execute(\s|\+)+immediate/i,
    /xp_cmdshell/i,

    // Stacked queries
    /;\s*(select|insert|update|delete|drop|create|alter)/i,

    // Time-based blind injection
    /sleep\s*\(/i,
    /benchmark\s*\(/i,
    /waitfor\s+delay/i,

    // Boolean-based blind injection
    /'?\s*(or|and)\s+'?1'?\s*='?1/i,
    /'?\s*(or|and)\s+'?[a-z]+'?\s*='?[a-z]+/i,

    // UNION-based injection
    /\bUNION\b.*\bSELECT\b/i,

    // Database fingerprinting
    /@@version/i,
    /version\(\)/i,
    /database\(\)/i,
    /user\(\)/i,

    // Hex encoding attempts
    /0x[0-9a-f]+/i,

    // Load file attempts
    /load_file\s*\(/i,
    /into\s+outfile/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Advanced XSS detection
 */
export function detectAdvancedXSS(input: string): boolean {
  const xssPatterns = [
    // Script tags
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<script.*?>/gi,

    // Event handlers
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on(error|load|click|mouse|focus|blur|change|submit|key)/gi,

    // JavaScript protocol
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,

    // iframe injection
    /<iframe[\s\S]*?>/gi,

    // object/embed tags
    /<(object|embed|applet)[\s\S]*?>/gi,

    // meta refresh
    /<meta[\s\S]*?http-equiv[\s\S]*?refresh[\s\S]*?>/gi,

    // form tags
    /<form[\s\S]*?>/gi,

    // base tag
    /<base[\s\S]*?>/gi,

    // link with javascript
    /<link[\s\S]*?href[\s\S]*?javascript[\s\S]*?>/gi,

    // img with onerror
    /<img[\s\S]*?onerror[\s\S]*?>/gi,

    // SVG with script
    /<svg[\s\S]*?onload[\s\S]*?>/gi,

    // HTML entities
    /&#x?\w+;/gi,

    // Expression in CSS
    /expression\s*\(/gi,
    /-moz-binding/gi,

    // Eval and similar
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect LDAP injection
 */
export function detectLDAPInjection(input: string): boolean {
  const ldapChars = /[*()|&]/;
  return ldapChars.test(input);
}

/**
 * Detect XML/XXE injection
 */
export function detectXXE(input: string): boolean {
  const xxePatterns = [/<!ENTITY/i, /<!DOCTYPE/i, /SYSTEM/i, /PUBLIC/i];
  return xxePatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect command injection
 */
export function detectCommandInjection(input: string): boolean {
  const cmdPatterns = [/[;&|`$]/, /\$\(/, /\${/, /\|\|/, /&&/, />\s*&/, /<\s*&/];
  return cmdPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect path traversal
 */
export function detectPathTraversal(input: string): boolean {
  const pathPatterns = [/\.\.\//, /\.\.\\/, /%2e%2e%2f/i, /%2e%2e\\/i, /\.\.%2f/i, /\.\.%5c/i];
  return pathPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect SSRF (Server-Side Request Forgery)
 */
export function detectSSRF(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Block local/private IP addresses
    const hostname = urlObj.hostname.toLowerCase();

    // localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Private IP ranges
    const ipv4Patterns = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // link-local
    ];

    if (ipv4Patterns.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    // Block cloud metadata endpoints
    const dangerousHosts = [
      '169.254.169.254', // AWS, Azure, GCP metadata
      'metadata.google.internal',
      'instance-data',
    ];

    if (dangerousHosts.includes(hostname)) {
      return true;
    }

    return false;
  } catch {
    return true; // Invalid URL
  }
}

/**
 * Validate email format (prevent injection)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate username (alphanumeric + underscore only)
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============= Cryptographic Functions =============

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data with SHA-256
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// ============= Security Headers =============

/**
 * Generate Content Security Policy
 */
export function generateCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

// ============= Request Validation =============

/**
 * Validate request body against all attack vectors
 */
export function validateRequestBody(body: any): {
  safe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  const checkValue = (value: any, path: string = ''): void => {
    if (typeof value === 'string') {
      if (detectAdvancedSQLInjection(value)) {
        threats.push(`SQL injection detected in ${path || 'request'}`);
      }
      if (detectAdvancedXSS(value)) {
        threats.push(`XSS detected in ${path || 'request'}`);
      }
      if (detectCommandInjection(value)) {
        threats.push(`Command injection detected in ${path || 'request'}`);
      }
      if (detectPathTraversal(value)) {
        threats.push(`Path traversal detected in ${path || 'request'}`);
      }
      if (detectLDAPInjection(value)) {
        threats.push(`LDAP injection detected in ${path || 'request'}`);
      }
      if (detectXXE(value)) {
        threats.push(`XXE attack detected in ${path || 'request'}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        checkValue(val, path ? `${path}.${key}` : key);
      });
    }
  };

  checkValue(body);

  return {
    safe: threats.length === 0,
    threats,
  };
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}
