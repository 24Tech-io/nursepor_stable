/**
 * Web Application Firewall (WAF) Rules
 * Basic WAF implementation for blocking common attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportSecurityIncident } from './threat-detection';

/**
 * SQL Injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\bunion\b.*\bselect\b)|(\bselect\b.*\bfrom\b)/i,
  /(\bdrop\b.*\btable\b)|(\bdelete\b.*\bfrom\b)/i,
  /(\binsert\b.*\binto\b)|(\bupdate\b.*\bset\b)/i,
  /(\bexec\b.*\()|(\bexecute\b.*\()/i,
  /(--|\/\*|\*\/|;)/,
  /(\bor\b\s*1\s*=\s*1)|(\band\b\s*1\s*=\s*1)/i,
  /(\bor\b.*\btrue\b)|(\band\b.*\bfalse\b)/i,
  /(\bwaitfor\b.*\bdelay\b)|(\bsleep\b\s*\()/i,
  /(\bxp_cmdshell\b)|(\bsp_executesql\b)/i,
];

/**
 * Cross-Site Scripting (XSS) patterns
 */
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["']?/gi, // Event handlers like onclick, onload, etc.
  /<img[\s\S]*?onerror/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

/**
 * Path Traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
];

/**
 * Command Injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/, // Shell metacharacters
  /\$\{.*\}/, // Variable expansion
  /\$\(.*\)/, // Command substitution
];

/**
 * Common attack files/paths
 */
const ATTACK_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/phpmyadmin',
  '/admin.php',
  '/administrator',
  '/wp-login.php',
  '/xmlrpc.php',
  '/.aws',
  '/.ssh',
  '/config.php',
  '/web.config',
  '/backup',
  '/.htaccess',
];

/**
 * Check if request contains SQL injection attempt
 */
function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if request contains XSS attempt
 */
function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if request contains path traversal attempt
 */
function detectPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if request contains command injection attempt
 */
function detectCommandInjection(input: string): boolean {
  return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Check if path is a known attack path
 */
function isAttackPath(path: string): boolean {
  return ATTACK_PATHS.some(attackPath => 
    path.toLowerCase().includes(attackPath.toLowerCase())
  );
}

/**
 * Analyze request for malicious patterns
 */
export interface WAFAnalysisResult {
  blocked: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function analyzeRequest(request: NextRequest): WAFAnalysisResult {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const searchParams = url.searchParams.toString();
  const method = request.method;
  
  // Check for attack paths
  if (isAttackPath(pathname)) {
    return {
      blocked: true,
      reason: 'Suspicious path detected',
      severity: 'high',
    };
  }
  
  // Check path for injections
  if (detectSQLInjection(pathname)) {
    return {
      blocked: true,
      reason: 'SQL injection detected in path',
      severity: 'critical',
    };
  }
  
  if (detectXSS(pathname)) {
    return {
      blocked: true,
      reason: 'XSS attempt detected in path',
      severity: 'high',
    };
  }
  
  if (detectPathTraversal(pathname)) {
    return {
      blocked: true,
      reason: 'Path traversal detected',
      severity: 'high',
    };
  }
  
  // Check query parameters
  if (searchParams) {
    if (detectSQLInjection(searchParams)) {
      return {
        blocked: true,
        reason: 'SQL injection detected in query parameters',
        severity: 'critical',
      };
    }
    
    if (detectXSS(searchParams)) {
      return {
        blocked: true,
        reason: 'XSS attempt detected in query parameters',
        severity: 'high',
      };
    }
    
    if (detectCommandInjection(searchParams)) {
      return {
        blocked: true,
        reason: 'Command injection detected in query parameters',
        severity: 'critical',
      };
    }
  }
  
  // Check HTTP headers for suspicious content
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  
  if (detectXSS(referer)) {
    return {
      blocked: true,
      reason: 'XSS attempt detected in referer',
      severity: 'medium',
    };
  }
  
  // Check for unusually large headers (potential DoS)
  const headerSize = Array.from(request.headers.entries())
    .reduce((size, [key, value]) => size + key.length + value.length, 0);
  
  if (headerSize > 8192) { // 8KB limit
    return {
      blocked: true,
      reason: 'Unusually large request headers',
      severity: 'medium',
    };
  }
  
  // Check for suspicious HTTP methods
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method)) {
    return {
      blocked: true,
      reason: `Unsupported HTTP method: ${method}`,
      severity: 'medium',
    };
  }
  
  return {
    blocked: false,
    reason: 'Request passed WAF checks',
    severity: 'low',
  };
}

/**
 * Apply WAF rules to incoming request
 */
export async function applyWAFRules(request: NextRequest): Promise<NextResponse | null> {
  const result = analyzeRequest(request);
  
  if (result.blocked) {
    const clientIP = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
      request.headers.get('x-real-ip') || 
      'unknown';
    
    // Report security incident (async, don't wait)
    reportSecurityIncident(
      clientIP,
      `WAF: ${result.reason}`,
      {
        path: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
      },
      result.severity
    ).catch(err => console.error('Failed to report incident:', err));
    
    // Return 403 Forbidden
    return new NextResponse(
      JSON.stringify({
        error: 'Forbidden',
        message: 'Your request was blocked by our security system',
        requestId: crypto.randomUUID(),
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
  
  return null; // Continue processing
}

/**
 * Rate limiting for specific paths (complement to general rate limiting)
 */
const PATH_RATE_LIMITS: Record<string, { requests: number; windowSeconds: number }> = {
  '/api/auth/login': { requests: 5, windowSeconds: 300 }, // 5 requests per 5 minutes
  '/api/auth/register': { requests: 3, windowSeconds: 3600 }, // 3 requests per hour
  '/api/auth/forgot-password': { requests: 3, windowSeconds: 1800 }, // 3 requests per 30 minutes
};

/**
 * Get rate limit for a specific path
 */
export function getPathRateLimit(path: string): { requests: number; windowSeconds: number } | null {
  for (const [pattern, limit] of Object.entries(PATH_RATE_LIMITS)) {
    if (path.startsWith(pattern)) {
      return limit;
    }
  }
  return null;
}

