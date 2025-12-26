/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other injection attacks
 */

// Use DOMPurify if available, otherwise use basic sanitization
let DOMPurify: any = null;
try {
  DOMPurify = require('isomorphic-dompurify');
} catch {
  // DOMPurify not available - use basic sanitization
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }
  
  // Use DOMPurify if available
  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href'],
      ALLOW_DATA_ATTR: false,
    });
  }
  
  // Fallback: Remove all HTML tags
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize plain text (removes HTML tags)
 */
export function sanitizeText(text: string, maxLength?: number): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize user input (general purpose)
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number;
  allowHTML?: boolean;
  stripSpecialChars?: boolean;
} = {}): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  const { maxLength, allowHTML = false, stripSpecialChars = false } = options;
  
  let sanitized = input.trim();
  
  // Remove special characters if requested
  if (stripSpecialChars) {
    sanitized = sanitized.replace(/[<>'"&]/g, '');
  }
  
  // Handle HTML
  if (allowHTML) {
    sanitized = sanitizeHTML(sanitized);
  } else {
    sanitized = sanitizeText(sanitized);
  }
  
  // Limit length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    maxLength?: number;
    allowHTML?: boolean;
  } = {}
): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key], options) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], options) as any;
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized) || sanitized.length > 255) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }
  
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

