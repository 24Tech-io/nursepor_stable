/**
 * Threat Detection and IP Blocking System
 * Monitors and blocks malicious IPs based on behavior patterns
 */

import { securityLogger } from './edge-logger';

interface ThreatScore {
  score: number;
  incidents: string[];
  firstSeen: number;
  lastSeen: number;
}

interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number;
  permanent: boolean;
}

// Threat scoring system
const threatScores = new Map<string, ThreatScore>();
const blockedIPs = new Map<string, BlockedIP>();
const suspiciousIPs = new Set<string>();

// Configuration
const THREAT_SCORE_THRESHOLD = 100;
const THREAT_SCORE_DECAY_RATE = 10; // Points decay per hour
const AUTO_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_THREAT_HISTORY = 1000;

// Known malicious patterns
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /nessus/i,
  /burp/i,
  /metasploit/i,
  /havij/i,
];

const SCANNER_PATTERNS = [
  /acunetix/i,
  /netsparker/i,
  /appscan/i,
  /webinspect/i,
];

/**
 * Calculate threat score for an IP
 */
export function calculateThreatScore(
  ip: string,
  incidentType: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): number {
  const now = Date.now();
  let threat = threatScores.get(ip);
  
  if (!threat) {
    threat = {
      score: 0,
      incidents: [],
      firstSeen: now,
      lastSeen: now,
    };
  }
  
  // Decay old scores
  const hoursSinceLastSeen = (now - threat.lastSeen) / (60 * 60 * 1000);
  threat.score = Math.max(0, threat.score - (hoursSinceLastSeen * THREAT_SCORE_DECAY_RATE));
  
  // Add new incident
  const severityScores = {
    low: 10,
    medium: 25,
    high: 50,
    critical: 100,
  };
  
  threat.score += severityScores[severity];
  threat.incidents.push(`${incidentType} (${severity})`);
  threat.lastSeen = now;
  
  // Keep only recent incidents
  if (threat.incidents.length > 20) {
    threat.incidents = threat.incidents.slice(-20);
  }
  
  threatScores.set(ip, threat);
  
  // Auto-block if threshold exceeded
  if (threat.score >= THREAT_SCORE_THRESHOLD) {
    blockIP(ip, `Threat score threshold exceeded (${threat.score})`, false);
  }
  
  // Mark as suspicious
  if (threat.score >= THREAT_SCORE_THRESHOLD / 2) {
    suspiciousIPs.add(ip);
  }
  
  return threat.score;
}

/**
 * Block an IP address
 */
export function blockIP(
  ip: string,
  reason: string,
  permanent: boolean = false
): void {
  const now = Date.now();
  const expiresAt = permanent ? now + (365 * 24 * 60 * 60 * 1000) : now + AUTO_BLOCK_DURATION;
  
  blockedIPs.set(ip, {
    ip,
    reason,
    blockedAt: now,
    expiresAt,
    permanent,
  });
  
  securityLogger.logSecurityEvent('IP Blocked', {
    ip,
    reason,
    permanent,
  });
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip: string): boolean {
  const blocked = blockedIPs.get(ip);
  if (!blocked) {
    return false;
  }
  
  if (blocked.permanent) {
    return false; // Cannot unblock permanent blocks
  }
  
  blockedIPs.delete(ip);
  threatScores.delete(ip);
  suspiciousIPs.delete(ip);
  
  securityLogger.logSecurityEvent('IP Unblocked', { ip });
  return true;
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): boolean {
  const blocked = blockedIPs.get(ip);
  if (!blocked) {
    return false;
  }
  
  const now = Date.now();
  
  // Check if block has expired
  if (!blocked.permanent && now > blocked.expiresAt) {
    blockedIPs.delete(ip);
    return false;
  }
  
  return true;
}

/**
 * Get block info for an IP
 */
export function getBlockInfo(ip: string): BlockedIP | null {
  return blockedIPs.get(ip) || null;
}

/**
 * Check if IP is suspicious
 */
export function isSuspicious(ip: string): boolean {
  return suspiciousIPs.has(ip);
}

/**
 * Get threat score for an IP
 */
export function getThreatScore(ip: string): number {
  const threat = threatScores.get(ip);
  return threat ? threat.score : 0;
}

/**
 * Detect malicious user agent
 */
export function detectMaliciousUserAgent(userAgent: string): boolean {
  return (
    MALICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent)) ||
    SCANNER_PATTERNS.some(pattern => pattern.test(userAgent))
  );
}

/**
 * Detect suspicious behavior patterns
 */
export function detectSuspiciousBehavior(
  ip: string,
  requestCount: number,
  timeWindow: number // in seconds
): boolean {
  const requestRate = requestCount / timeWindow;
  
  // More than 10 requests per second is suspicious
  if (requestRate > 10) {
    calculateThreatScore(ip, 'High request rate', 'medium');
    return true;
  }
  
  return false;
}

/**
 * Report security incident
 */
export function reportSecurityIncident(
  ip: string,
  incidentType: string,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  calculateThreatScore(ip, incidentType, severity);
  
  securityLogger.logSecurityEvent('Security Incident', {
    ip,
    type: incidentType,
    severity,
    details,
    threatScore: getThreatScore(ip),
  });
}

/**
 * Get list of blocked IPs
 */
export function getBlockedIPs(): BlockedIP[] {
  const now = Date.now();
  const blocked: BlockedIP[] = [];
  
  for (const [ip, info] of Array.from(blockedIPs.entries())) {
    // Remove expired blocks
    if (!info.permanent && now > info.expiresAt) {
      blockedIPs.delete(ip);
    } else {
      blocked.push(info);
    }
  }
  
  return blocked;
}

/**
 * Get suspicious IPs
 */
export function getSuspiciousIPs(): Array<{ ip: string; score: number; incidents: string[] }> {
  const suspicious: Array<{ ip: string; score: number; incidents: string[] }> = [];
  
  for (const ip of suspiciousIPs) {
    const threat = threatScores.get(ip);
    if (threat) {
      suspicious.push({
        ip,
        score: threat.score,
        incidents: threat.incidents,
      });
    }
  }
  
  return suspicious.sort((a, b) => b.score - a.score);
}

/**
 * Check if IP is from Tor network (basic check)
 */
export function isTorIP(ip: string): boolean {
  // This is a basic implementation
  // In production, use a Tor exit node list API
  const torPatterns = [
    /^185\.220\./,
    /^77\.247\./,
  ];
  
  return torPatterns.some(pattern => pattern.test(ip));
}

/**
 * Analyze request for threats
 */
export function analyzeRequest(data: {
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}): {
  safe: boolean;
  threats: string[];
  threatScore: number;
} {
  const threats: string[] = [];
  let currentScore = getThreatScore(data.ip);
  
  // Check if IP is blocked
  if (isIPBlocked(data.ip)) {
    threats.push('IP is blocked');
  }
  
  // Check user agent
  if (detectMaliciousUserAgent(data.userAgent)) {
    threats.push('Malicious user agent detected');
    currentScore = calculateThreatScore(data.ip, 'Malicious user agent', 'high');
  }
  
  // Check for scanning behavior
  if (data.path.includes('..') || data.path.includes('%2e')) {
    threats.push('Path traversal attempt');
    currentScore = calculateThreatScore(data.ip, 'Path traversal', 'high');
  }
  
  // Check for admin panel scanning
  const adminPaths = ['/admin', '/wp-admin', '/phpmyadmin', '/.env', '/.git'];
  if (adminPaths.some(path => data.path.includes(path))) {
    currentScore = calculateThreatScore(data.ip, 'Admin panel scanning', 'medium');
  }
  
  // Check for suspicious headers
  if (data.headers['x-forwarded-for']?.split(',').length > 5) {
    threats.push('Suspicious proxy chain');
    currentScore = calculateThreatScore(data.ip, 'Proxy chain', 'low');
  }
  
  // Check if from Tor
  if (isTorIP(data.ip)) {
    threats.push('Tor exit node detected');
    currentScore = calculateThreatScore(data.ip, 'Tor usage', 'low');
  }
  
  return {
    safe: threats.length === 0,
    threats,
    threatScore: currentScore,
  };
}

// Clean up old data every hour
setInterval(() => {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Clean threat scores
  for (const [ip, threat] of Array.from(threatScores.entries())) {
    if (now - threat.lastSeen > maxAge) {
      threatScores.delete(ip);
      suspiciousIPs.delete(ip);
    }
  }
  
  // Limit size
  if (threatScores.size > MAX_THREAT_HISTORY) {
    const sorted = Array.from(threatScores.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    
    const toRemove = sorted.slice(0, sorted.length - MAX_THREAT_HISTORY);
    toRemove.forEach(([ip]) => {
      threatScores.delete(ip);
      suspiciousIPs.delete(ip);
    });
  }
}, 60 * 60 * 1000);

