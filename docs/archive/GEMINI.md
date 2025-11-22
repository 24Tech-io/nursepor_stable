# LMS Platform - Gemini Context

## Project Overview
This is a Next.js 14 Learning Management System (LMS) platform with:
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Drizzle ORM with better-sqlite3 / Neon Postgres
- **Authentication:** JWT-based with bcryptjs
- **Payments:** Stripe integration
- **Features:** Courses, blogs, student dashboard, admin panel, face recognition login

## Current Issues to Fix

### 🔴 Priority 1: Linter Errors (URGENT)
**File:** `src/middleware.ts`
**Problem:** `securityLogger` is not defined
**Lines:** 39, 108, 128, 151, 165
**Context:** The middleware uses `securityLogger` but it's not imported from `src/lib/logger.ts`

### 🟡 Priority 2: Security Vulnerabilities
- **esbuild:** Moderate severity in drizzle-kit (dev dependency only)
- **node-fetch:** High severity in face-api.js dependencies

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Admin endpoints
│   │   ├── student/      # Student endpoints
│   │   └── ai-assist/    # Gemini AI integration
│   ├── admin/            # Admin dashboard pages
│   └── student/          # Student dashboard pages
├── components/            # React components
│   ├── auth/
│   ├── common/
│   └── student/
├── lib/                   # Utilities & helpers
│   ├── auth.ts           # Authentication logic
│   ├── db/               # Database schema & queries
│   ├── logger.ts         # Winston logger (exports securityLogger!)
│   ├── security*.ts      # Security middleware & helpers
│   └── gemini.ts         # Gemini AI helper functions
└── middleware.ts          # Next.js middleware (HAS ERRORS!)
```

## Code Conventions

- Use TypeScript with strict mode
- Follow Next.js 14 App Router patterns
- Use Drizzle ORM for database queries
- Implement proper error handling with try-catch
- Log security events with `securityLogger`
- Use Zod for validation
- Follow security best practices (CSRF, rate limiting, etc.)

## Key Files to Reference

### Logger Setup
**File:** `src/lib/logger.ts`
- Exports: `logger`, `securityLogger`, `auditLogger`
- Use `securityLogger.info()`, `securityLogger.warn()`, `securityLogger.error()`

### Authentication
**File:** `src/lib/auth.ts`
- JWT token generation and verification
- User authentication helpers

### Security Middleware
**Files:** `src/lib/security-middleware.ts`, `src/lib/security.ts`
- Rate limiting, CSRF protection, SSRF prevention

## When Fixing Issues

1. **Imports:** Always check if functions/variables are imported
2. **Types:** Ensure TypeScript types are correct
3. **Security:** Maintain all security measures (don't remove for convenience)
4. **Error Handling:** Keep try-catch blocks and proper error responses
5. **Logging:** Use appropriate logger (`securityLogger` for security events)

## Testing Endpoints

```bash
# Dev server
npm run dev

# Security audit
npm run security:check

# Linting
npm run lint
```

## Environment Variables Required

```env
DATABASE_URL=
JWT_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
```

## Common Tasks

### Fix Import Issues
Check if the module exists in `src/lib/` and import it properly.

### Fix Security Logs
Import: `import { securityLogger } from '@/lib/logger';`

### Add API Endpoints
Follow pattern in `src/app/api/` with proper authentication checks.

### Update Database Schema
Modify `src/lib/db/schema.ts` and run migrations.

## Important Notes

- This is a production LMS with real students and courses
- Security is critical - maintain all security measures
- Always validate user input with Zod schemas
- Rate limit all public endpoints
- Log all security-relevant events

## Goals

- [ ] Fix all linter errors (especially securityLogger in middleware.ts)
- [ ] Resolve security vulnerabilities
- [ ] Improve code quality
- [ ] Add more comprehensive error handling
- [ ] Enhance security measures
- [ ] Optimize performance

---

**When helping with this project:**
- Prioritize security and stability
- Provide complete, working solutions
- Explain the reasoning behind fixes
- Suggest improvements when relevant
- Test suggestions against TypeScript/Next.js best practices

