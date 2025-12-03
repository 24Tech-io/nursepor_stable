/**
 * SSRF (Server-Side Request Forgery) Protection
 * Validates and restricts outbound HTTP requests to prevent SSRF attacks
 */

import { URL } from 'url';
import { securityLogger } from './logger';

// Whitelist of allowed domains for external requests
const ALLOWED_DOMAINS = [
  'api.stripe.com',
  'hooks.stripe.com',
  'js.stripe.com',
  'api.neon.tech',
  process.env.NEXT_PUBLIC_API_URL,
  // Add your trusted external APIs here
].filter(Boolean) as string[];

// Blacklist of private/internal IP ranges (CIDR notation)
const BLOCKED_IP_RANGES = [
  '10.0.0.0/8', // Private network
  '172.16.0.0/12', // Private network
  '192.168.0.0/16', // Private network
  '127.0.0.0/8', // Loopback
  '169.254.0.0/16', // Link-local
  '::1/128', // IPv6 loopback
  'fe80::/10', // IPv6 link-local
  'fc00::/7', // IPv6 unique local
];

// Blocked protocols
const BLOCKED_PROTOCOLS = ['file:', 'gopher:', 'ftp:', 'dict:', 'ldap:', 'tftp:'];

/**
 * Check if an IP address is in a blocked range
 */
function isIPInBlockedRange(ip: string): boolean {
  // Simple check for obvious private IPs
  // In production, use a proper IP range checker library
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip === 'localhost' ||
    ip === '::1'
  ) {
    return true;
  }

  // Check 172.16.0.0/12 range
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

/**
 * Validate if a URL is safe to request
 */
export function validateURL(
  urlString: string,
  clientIP?: string
): {
  valid: boolean;
  error?: string;
  url?: URL;
} {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
      if (clientIP) {
        securityLogger.logSSRFAttempt(clientIP, urlString);
      }
      return {
        valid: false,
        error: `Protocol ${url.protocol} is not allowed`,
      };
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      if (clientIP) {
        securityLogger.logSSRFAttempt(clientIP, urlString);
      }
      return {
        valid: false,
        error: 'Only HTTP and HTTPS protocols are allowed',
      };
    }

    // Check if domain is in whitelist
    const isWhitelisted = ALLOWED_DOMAINS.some((domain) => {
      if (domain.startsWith('*.')) {
        // Wildcard subdomain
        const baseDomain = domain.slice(2);
        return url.hostname.endsWith(baseDomain);
      }
      return url.hostname === domain;
    });

    if (!isWhitelisted) {
      if (clientIP) {
        securityLogger.logSSRFAttempt(clientIP, urlString);
      }
      return {
        valid: false,
        error: `Domain ${url.hostname} is not in the allowed list`,
      };
    }

    // Check for IP-based URLs trying to access internal resources
    if (isIPInBlockedRange(url.hostname)) {
      if (clientIP) {
        securityLogger.logSSRFAttempt(clientIP, urlString);
      }
      return {
        valid: false,
        error: 'Cannot access internal/private IP addresses',
      };
    }

    return { valid: true, url };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Safe fetch wrapper with SSRF protection
 */
export async function safeFetch(
  urlString: string,
  options: RequestInit = {},
  clientIP?: string
): Promise<Response> {
  const validation = validateURL(urlString, clientIP);

  if (!validation.valid) {
    throw new Error(`SSRF Protection: ${validation.error}`);
  }

  // Add timeout to prevent long-running requests
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(urlString, {
      ...options,
      signal: controller.signal,
      // Limit redirects
      redirect: 'manual',
    });

    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Add a domain to the whitelist (for dynamic configuration)
 */
export function addAllowedDomain(domain: string): void {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
  }
}

/**
 * Remove a domain from the whitelist
 */
export function removeAllowedDomain(domain: string): void {
  const index = ALLOWED_DOMAINS.indexOf(domain);
  if (index > -1) {
    ALLOWED_DOMAINS.splice(index, 1);
  }
}

/**
 * Get current allowed domains (for debugging/admin)
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}

/**
 * Validate webhook URLs (for services like Stripe)
 */
export function validateWebhookURL(urlString: string): boolean {
  const validation = validateURL(urlString);
  return validation.valid;
}
