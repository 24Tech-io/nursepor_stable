# Security Documentation

This document outlines the comprehensive security measures implemented in the LMS platform to protect against various cyber attacks.

## Table of Contents

1. [Overview](#overview)
2. [Security Features](#security-features)
3. [Attack Protection](#attack-protection)
4. [Configuration](#configuration)
5. [Best Practices](#best-practices)
6. [Monitoring & Logging](#monitoring--logging)

## Overview

The platform implements multiple layers of security to defend against:
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Brute Force Attacks
- DDoS/Rate Limiting
- Command Injection
- Path Traversal
- SSRF (Server-Side Request Forgery)
- XXE (XML External Entity)
- LDAP Injection
- Credential Stuffing
- Session Hijacking
- And more...

## Security Features

### 1. CSRF Protection

**Location:** `src/lib/csrf-protection.ts`

- Generates secure CSRF tokens for each session
- Tokens expire after 1 hour
- Timing-safe comparison to prevent timing attacks
- Automatic token regeneration after sensitive operations

**Usage:**
```typescript
// Get CSRF token
const response = await fetch('/api/csrf');
const { csrfToken } = await response.json();

// Include in requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

### 2. Brute Force Protection

**Location:** `src/lib/brute-force-protection.ts`

- Maximum 5 failed login attempts per IP/username
- 15-minute attempt window
- 1-hour automatic block after threshold
- Progressive delays (0s, 1s, 2s, 5s, 10s)
- Tracks both IP and username attempts
- Credential stuffing detection

**Features:**
- IP-based blocking
- Username-based blocking
- Automatic unblocking after cooldown
- Failed attempt counting
- Detection of rapid attempts (credential stuffing)

### 3. Advanced Input Validation

**Location:** `src/lib/advanced-security.ts`

Detects and prevents:

#### SQL Injection
- Basic SQL keywords (SELECT, INSERT, UPDATE, DELETE)
- Union-based injection
- Time-based blind injection
- Boolean-based blind injection
- Database fingerprinting
- Hex encoding attempts

#### XSS (Cross-Site Scripting)
- Script tag injection
- Event handler injection
- JavaScript protocol
- iframe injection
- SVG with scripts
- CSS expression injection

#### Other Attacks
- **LDAP Injection:** Detects special LDAP characters
- **XXE:** Detects XML entity declarations
- **Command Injection:** Detects shell metacharacters
- **Path Traversal:** Detects directory traversal attempts
- **SSRF:** Blocks internal/private IP addresses

### 4. Threat Detection & IP Blocking

**Location:** `src/lib/threat-detection.ts`

**Threat Scoring System:**
- Low severity: +10 points
- Medium severity: +25 points
- High severity: +50 points
- Critical severity: +100 points
- Auto-block at 100 points
- Points decay over time (10 points/hour)

**Automatic Blocking:**
- IPs exceeding threat threshold
- Malicious user agents (sqlmap, nikto, nmap, etc.)
- Scanner patterns
- Suspicious behavior (high request rate)
- Tor exit nodes (configurable)

**Monitoring:**
- Track threat scores per IP
- Record security incidents
- Identify suspicious IPs
- Maintain blocked IP list
- Analyze request patterns

### 5. Rate Limiting

**Location:** `src/lib/security-middleware.ts`

**Development:**
- 1000 requests per 5 minutes
- Lenient for testing

**Production:**
- 100 requests per 15 minutes
- Strict for security

**Per-Endpoint Limits:**
- Login: 5 attempts per 15 minutes
- API endpoints: Configurable per route

### 6. Security Headers

**Implemented Headers:**
```http
Content-Security-Policy: Comprehensive CSP
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: Restricted permissions
Strict-Transport-Security: HTTPS enforcement
```

**Removed Headers:**
- X-Powered-By (prevents fingerprinting)
- Server (prevents fingerprinting)

### 7. Password Security

**Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character
- Not a common password

**Implementation:**
- Bcrypt hashing (cost factor 10)
- Passwords never stored in plain text
- No password hints or recovery questions

### 8. Session Security

**Features:**
- HttpOnly cookies (prevent XSS access)
- SameSite=Lax (CSRF protection)
- Secure flag in production (HTTPS only)
- 7-day expiration
- Session invalidation on logout
- Automatic cleanup of expired sessions

### 9. Input Sanitization

**Functions:**
- HTML entity encoding
- Script tag removal
- Special character escaping
- Email validation
- Username validation (alphanumeric + underscore)
- Recursive object sanitization

## Attack Protection

### Protection Matrix

| Attack Type | Prevention Method | Location |
|------------|------------------|----------|
| SQL Injection | Pattern detection, prepared statements | `advanced-security.ts` |
| XSS | HTML sanitization, CSP headers | `advanced-security.ts` |
| CSRF | Token validation | `csrf-protection.ts` |
| Brute Force | Rate limiting, progressive delays | `brute-force-protection.ts` |
| DDoS | Rate limiting, IP blocking | `threat-detection.ts` |
| Command Injection | Special character detection | `advanced-security.ts` |
| Path Traversal | Pattern detection | `advanced-security.ts` |
| SSRF | IP validation, URL parsing | `advanced-security.ts` |
| XXE | XML entity detection | `advanced-security.ts` |
| LDAP Injection | Special character detection | `advanced-security.ts` |
| Session Hijacking | Secure cookies, HttpOnly | `auth.ts` |
| Clickjacking | X-Frame-Options header | `comprehensive-security.ts` |
| MIME Sniffing | X-Content-Type-Options | `comprehensive-security.ts` |

## Configuration

### Environment Variables

```env
# Security
NODE_ENV=production # Enable strict security in production
CSRF_SECRET=your-secure-random-secret
SESSION_SECRET=your-secure-random-secret

# Database
DATABASE_URL=postgresql://...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Config

**File:** `src/lib/comprehensive-security.ts`

```typescript
export const securityConfig = {
  enableCSRFProtection: true,
  enableBruteForceProtection: true,
  enableThreatDetection: true,
  enableInputValidation: true,
  enableRateLimiting: true,
  blockTorUsers: false, // Set to true to block Tor
  logAllRequests: process.env.NODE_ENV === 'production',
};
```

## Best Practices

### For Developers

1. **Always validate user input** on both client and server
2. **Use parameterized queries** for database operations
3. **Sanitize output** when displaying user-generated content
4. **Implement CSRF tokens** for all state-changing operations
5. **Use HTTPS** in production
6. **Keep dependencies updated** to patch vulnerabilities
7. **Never log sensitive data** (passwords, tokens, etc.)
8. **Implement proper error handling** (don't expose stack traces)
9. **Use principle of least privilege** for database access
10. **Regular security audits** and penetration testing

### For Administrators

1. **Enable all security features** in production
2. **Monitor security logs** regularly
3. **Keep blocklist updated**
4. **Use strong database passwords**
5. **Enable database backups**
6. **Limit API access** to known IPs if possible
7. **Implement Web Application Firewall (WAF)**
8. **Regular security updates**
9. **Monitor failed login attempts**
10. **Incident response plan**

## Monitoring & Logging

### Security Events Logged

1. **Failed login attempts**
   - IP address
   - Username/email
   - Timestamp
   - Reason

2. **Blocked IP attempts**
   - IP address
   - Endpoint accessed
   - Block reason

3. **Security incidents**
   - Incident type
   - Severity level
   - IP address
   - Details

4. **Threat score changes**
   - IP address
   - Score increase
   - Incident type

### Log Locations

- **Console:** Real-time logs (development)
- **Edge Logger:** Middleware security events
- **Application Logger:** General application logs

### Monitoring Endpoints (Development Only)

```bash
# Check blocked IPs
GET /api/dev/security/blocked-ips

# Check suspicious IPs
GET /api/dev/security/suspicious-ips

# Clear rate limits
POST /api/dev/reset-rate-limit

# Unblock IP
POST /api/dev/security/unblock
Body: { "ip": "192.168.1.1" }
```

## Security Checklist

### Deployment

- [ ] Change all default secrets
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Configure secure session cookies
- [ ] Enable all security features
- [ ] Set up monitoring/alerting
- [ ] Configure database encryption
- [ ] Implement backup strategy
- [ ] Set up WAF
- [ ] Configure CORS properly
- [ ] Review security headers
- [ ] Test all security features
- [ ] Perform security audit
- [ ] Document incident response plan

### Regular Maintenance

- [ ] Review security logs (daily)
- [ ] Update dependencies (weekly)
- [ ] Review blocked IPs (weekly)
- [ ] Security audit (monthly)
- [ ] Penetration testing (quarterly)
- [ ] Update threat patterns (quarterly)
- [ ] Review access controls (quarterly)
- [ ] Disaster recovery drill (annually)

## Incident Response

### If Security Breach Detected:

1. **Immediate Actions:**
   - Block the attacker's IP
   - Revoke affected sessions
   - Enable maintenance mode if needed
   - Notify security team

2. **Investigation:**
   - Review security logs
   - Identify attack vector
   - Assess damage
   - Document findings

3. **Remediation:**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Update security rules
   - Notify affected users if data exposed

4. **Post-Incident:**
   - Update security measures
   - Conduct post-mortem
   - Update documentation
   - Implement additional monitoring

## Compliance

### GDPR Considerations

- User data encrypted at rest and in transit
- Right to be forgotten implemented
- Data breach notification procedures
- Privacy policy in place
- User consent mechanisms

### OWASP Top 10 Coverage

- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Authentication Failures
- ✅ A08: Software and Data Integrity
- ✅ A09: Logging and Monitoring Failures
- ✅ A10: Server-Side Request Forgery (SSRF)

## Support

For security concerns or to report vulnerabilities:
- Email: security@your-domain.com
- Use responsible disclosure
- Do not publicly disclose vulnerabilities before they are patched

## Version History

- **v1.0.0** - Initial comprehensive security implementation
  - CSRF protection
  - Brute force protection
  - Advanced input validation
  - Threat detection system
  - IP blocking
  - Security headers
  - Session security

## License

See LICENSE file for details.

