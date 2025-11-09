/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens for all state-changing operations
 */

import crypto from 'crypto';

// In-memory store for CSRF tokens (use Redis in production)
const csrfTokenStore = new Map<string, { token: string; createdAt: number }>();

// CSRF token expiry time (1 hour)
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000;

// Clean up expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokenStore.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate a new CSRF token for a session
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedData = csrfTokenStore.get(sessionId);
  
  if (!storedData) {
    return false;
  }

  // Check if token has expired
  if (Date.now() - storedData.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedData.token)
  );
}

/**
 * Delete a CSRF token
 */
export function deleteCSRFToken(sessionId: string): void {
  csrfTokenStore.delete(sessionId);
}

/**
 * Regenerate CSRF token (good practice after sensitive operations)
 */
export function regenerateCSRFToken(sessionId: string): string {
  deleteCSRFToken(sessionId);
  return generateCSRFToken(sessionId);
}
