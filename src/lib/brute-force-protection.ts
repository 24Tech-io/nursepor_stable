/**
 * Brute Force Attack Protection
 * Prevents repeated failed login attempts and credential stuffing
 */

interface LoginAttempt {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// Track failed login attempts by IP and username
const ipAttempts = new Map<string, LoginAttempt>();
const usernameAttempts = new Map<string, LoginAttempt>();
const blockedIPs = new Set<string>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum failed attempts
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block
const PROGRESSIVE_DELAY = [0, 1000, 2000, 5000, 10000]; // Progressive delays in ms

// Clean up old attempts every 10 minutes
setInterval(
  () => {
    const now = Date.now();

    // Clean IP attempts
    for (const [ip, attempt] of Array.from(ipAttempts.entries())) {
      if (
        now - attempt.lastAttempt > ATTEMPT_WINDOW &&
        (!attempt.blockedUntil || now > attempt.blockedUntil)
      ) {
        ipAttempts.delete(ip);
        blockedIPs.delete(ip);
      }
    }

    // Clean username attempts
    for (const [username, attempt] of Array.from(usernameAttempts.entries())) {
      if (
        now - attempt.lastAttempt > ATTEMPT_WINDOW &&
        (!attempt.blockedUntil || now > attempt.blockedUntil)
      ) {
        usernameAttempts.delete(username);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): boolean {
  const attempt = ipAttempts.get(ip);
  if (!attempt || !attempt.blockedUntil) {
    return false;
  }

  const now = Date.now();
  if (now > attempt.blockedUntil) {
    // Unblock
    attempt.blockedUntil = undefined;
    attempt.attempts = 0;
    blockedIPs.delete(ip);
    return false;
  }

  return true;
}

/**
 * Check if a username is blocked
 */
export function isUsernameBlocked(username: string): boolean {
  const attempt = usernameAttempts.get(username);
  if (!attempt || !attempt.blockedUntil) {
    return false;
  }

  const now = Date.now();
  if (now > attempt.blockedUntil) {
    // Unblock
    attempt.blockedUntil = undefined;
    attempt.attempts = 0;
    return false;
  }

  return true;
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(
  ip: string,
  username: string
): {
  blocked: boolean;
  remainingAttempts: number;
  blockDuration?: number;
  delayMs: number;
} {
  const now = Date.now();

  // Record IP attempt
  let ipAttempt = ipAttempts.get(ip);
  if (!ipAttempt || now - ipAttempt.lastAttempt > ATTEMPT_WINDOW) {
    ipAttempt = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
  } else {
    ipAttempt.attempts++;
    ipAttempt.lastAttempt = now;
  }
  ipAttempts.set(ip, ipAttempt);

  // Record username attempt
  let userAttempt = usernameAttempts.get(username);
  if (!userAttempt || now - userAttempt.lastAttempt > ATTEMPT_WINDOW) {
    userAttempt = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
  } else {
    userAttempt.attempts++;
    userAttempt.lastAttempt = now;
  }
  usernameAttempts.set(username, userAttempt);

  // Get progressive delay
  const delayIndex = Math.min(ipAttempt.attempts - 1, PROGRESSIVE_DELAY.length - 1);
  const delayMs = PROGRESSIVE_DELAY[delayIndex];

  // Check if should block
  if (ipAttempt.attempts >= MAX_ATTEMPTS || userAttempt.attempts >= MAX_ATTEMPTS) {
    ipAttempt.blockedUntil = now + BLOCK_DURATION;
    userAttempt.blockedUntil = now + BLOCK_DURATION;
    blockedIPs.add(ip);

    return {
      blocked: true,
      remainingAttempts: 0,
      blockDuration: BLOCK_DURATION,
      delayMs,
    };
  }

  return {
    blocked: false,
    remainingAttempts: MAX_ATTEMPTS - ipAttempt.attempts,
    delayMs,
  };
}

/**
 * Record a successful login (clear attempts)
 */
export function recordSuccessfulLogin(ip: string, username: string): void {
  ipAttempts.delete(ip);
  usernameAttempts.delete(username);
  blockedIPs.delete(ip);
}

/**
 * Get remaining attempts for an IP
 */
export function getRemainingAttempts(ip: string): number {
  const attempt = ipAttempts.get(ip);
  if (!attempt) {
    return MAX_ATTEMPTS;
  }

  const now = Date.now();
  if (now - attempt.lastAttempt > ATTEMPT_WINDOW) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - attempt.attempts);
}

/**
 * Manually block an IP (for suspicious activity)
 */
export function blockIP(ip: string, duration: number = BLOCK_DURATION): void {
  const now = Date.now();
  ipAttempts.set(ip, {
    attempts: MAX_ATTEMPTS,
    firstAttempt: now,
    lastAttempt: now,
    blockedUntil: now + duration,
  });
  blockedIPs.add(ip);
}

/**
 * Manually unblock an IP
 */
export function unblockIP(ip: string): void {
  ipAttempts.delete(ip);
  blockedIPs.delete(ip);
}

/**
 * Get list of blocked IPs
 */
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

/**
 * Check if pattern indicates credential stuffing attack
 */
export function detectCredentialStuffing(ip: string): boolean {
  const attempt = ipAttempts.get(ip);
  if (!attempt) {
    return false;
  }

  // If many attempts in short time, likely credential stuffing
  const attemptRate = attempt.attempts / ((Date.now() - attempt.firstAttempt) / 1000);
  return attemptRate > 0.5; // More than 0.5 attempts per second
}
