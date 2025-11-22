# 🔐 Security Quick Reference Guide

## 🚀 Quick Start

### Run Security Checks
```bash
# Check for vulnerabilities
npm run security:audit

# Check vulnerabilities and outdated packages
npm run security:check

# Attempt automatic fixes
npm run security:fix
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/lib/security-middleware.ts` | Core security functions |
| `src/lib/csrf-protection.ts` | CSRF protection |
| `src/lib/ssrf-protection.ts` | SSRF prevention |
| `src/lib/validation-schemas.ts` | Input validation |
| `src/lib/logger.ts` | Security logging |
| `src/middleware.ts` | Enhanced middleware |
| `logs/security.log` | Security events log |

---

## 🛡️ Using Security Features

### 1. Rate Limiting
```typescript
import { rateLimit } from '@/lib/security-middleware';

const result = rateLimit(req);
if (result.limited) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

### 2. CSRF Protection
```typescript
import { generateCSRFToken, validateCSRFToken } from '@/lib/csrf-protection';

// Generate
const token = await generateCSRFToken(sessionId);

// Validate
const result = await validateCSRFToken(req, sessionId);
if (!result.valid) {
  return res.status(403).json({ error: 'CSRF failed' });
}
```

### 3. Input Validation
```typescript
import { loginSchema } from '@/lib/validation-schemas';

const result = loginSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error });
}
```

### 4. SSRF Protection
```typescript
import { safeFetch } from '@/lib/ssrf-protection';

const response = await safeFetch(url, options, clientIP);
```

### 5. Security Logging
```typescript
import { securityLogger } from '@/lib/logger';

securityLogger.logFailedAuth(ip, username, reason);
securityLogger.logSQLInjectionAttempt(ip, payload);
securityLogger.logRateLimitExceeded(ip, endpoint);
```

---

## 🔒 Environment Variables

### Required Secrets (32+ characters)
```env
JWT_SECRET=your-secret-here
CSRF_SECRET=your-secret-here
SESSION_SECRET=your-secret-here
```

### Application Settings
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
FORCE_HTTPS=true
```

### CORS Whitelist
```env
ALLOWED_ORIGIN_1=https://yourdomain.com
ALLOWED_ORIGIN_2=https://www.yourdomain.com
```

---

## 📊 Current Vulnerability Status

| Severity | Count | Status |
|----------|-------|--------|
| High | 1 | ⚠️ Mitigated (SSRF protection) |
| Moderate | 2 | ⚠️ Mitigated (dev-only) |
| Low | 2 | ⚠️ Mitigated (local processing) |
| **Total** | **5** | **✅ Production-safe** |

### Mitigation Status
- ✅ **node-fetch** - SSRF protection layer implemented
- ✅ **esbuild** - Dev dependency only, not in production
- ✅ **TensorFlow** - No network calls, local processing only

---

## 🎯 Security Checklist

### Daily
- [ ] Review `logs/security.log`
- [ ] Check failed auth attempts

### Weekly
- [ ] Run `npm run security:check`
- [ ] Review access logs

### Monthly
- [ ] Update dependencies
- [ ] Review security configs
- [ ] Test disaster recovery

### Quarterly
- [ ] Security audit
- [ ] Rotate secrets
- [ ] Penetration testing

---

## 🚨 Security Incident Response

### If You Discover a Vulnerability

1. **DO NOT** open a public issue
2. Email: security@yourdomain.com
3. Include:
   - Description
   - Steps to reproduce
   - Impact assessment
   - Suggested fix

### Response Times
- **Critical:** 24 hours
- **High:** 72 hours
- **Medium:** 7 days
- **Low:** 30 days

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `SECURITY_HARDENING_CHECKLIST.md` | Complete security checklist |
| `VULNERABILITY_MITIGATION_REPORT.md` | Detailed vulnerability report |
| `SECURITY_IMPLEMENTATION_SUMMARY.md` | Implementation overview |
| `SECURITY_QUICK_REFERENCE.md` | This guide |

---

## ✅ Production Deployment

### Pre-Deployment Checklist
- [ ] Update all secrets in `.env`
- [ ] Run `npm run security:check`
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable database SSL
- [ ] Configure monitoring

### Post-Deployment Checklist
- [ ] Verify HTTPS working
- [ ] Test rate limiting
- [ ] Check security headers (SSL Labs)
- [ ] Monitor logs for 24 hours
- [ ] Set up automated alerts

---

## 🛠️ Useful Commands

```bash
# Security checks
npm run security:audit          # Check vulnerabilities
npm run security:check          # Check vulnerabilities + outdated
npm run security:fix            # Auto-fix vulnerabilities

# Linting
npm run lint                    # Next.js linter
npm run lint:security           # Security-focused linting

# Development
npm run dev                     # Development server
npm run build                   # Production build
npm start                       # Production server

# Logs
tail -f logs/security.log       # Follow security log
tail -f logs/error.log          # Follow error log
tail -f logs/combined.log       # Follow all logs
```

---

## 📞 Contacts

**Security Issues:** security@yourdomain.com  
**Technical Support:** dev@yourdomain.com  
**Documentation:** docs@yourdomain.com

---

## 🎓 Training Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/routing/security)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** November 8, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready

