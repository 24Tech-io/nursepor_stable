import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';
import { sanitizeString, validateEmail, getClientIP, rateLimit, validateBodySize } from '@/lib/security';
import {
  isIPBlocked,
  isUsernameBlocked,
  recordFailedAttempt,
  recordSuccessfulLogin
} from '@/lib/brute-force-protection';
import { reportSecurityIncident } from '@/lib/threat-detection';
import { log } from '@/lib/logger-helper';
import { handleApiError, ApiErrors } from '@/lib/api-error';
import { securityLogger } from '@/lib/edge-logger';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for admin login
    let clientIP: string;
    try {
      clientIP = getClientIP(request);
    } catch (ipError: any) {
      log.error('Error getting client IP', ipError);
      clientIP = 'unknown';
    }

    // Check brute force protection
    let isBlocked = false;
    try {
      isBlocked = isIPBlocked(clientIP);
    } catch (blockError: any) {
      log.error('Error checking IP block', blockError);
    }

    if (isBlocked) {
      try {
        securityLogger.info('Blocked IP attempted admin login', { ip: clientIP });
      } catch (logError) {
        log.error('Error logging security event', logError);
      }
      return NextResponse.json(
        { 
          message: 'Server configuration error. DATABASE_URL is missing.',
          error: process.env.NODE_ENV === 'development' ? 'DATABASE_URL must be set in environment variables' : undefined
        },
        { status: 500 }
      );
    }

    // Rate limiting
    let rateLimitResult: any = { allowed: true };
    try {
      rateLimitResult = rateLimit(`admin-login:${clientIP}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
    } catch (rateError: any) {
      log.error('Error in rate limiting', rateError);
    }

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate request body size
    let body: string;
    try {
      body = await request.text();
    } catch (bodyError: any) {
      log.error('Error reading request body', bodyError);
      return handleApiError(ApiErrors.validation('Failed to read request body'), request.nextUrl.pathname);
    }

    let bodySizeValid = true;
    try {
      bodySizeValid = validateBodySize(body, 512); // 512 bytes max
    } catch (sizeError: any) {
      log.error('Error validating body size', sizeError);
    }

    if (!bodySizeValid) {
      return NextResponse.json(
        { message: 'Request body too large' },
        { status: 413 }
      );
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { email, password, rememberMe } = data;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Sanitize and validate email
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
    } catch (sanitizeError: any) {
      log.error('Error sanitizing email', sanitizeError);
      sanitizedEmail = email.toLowerCase().trim();
    }

    let emailValid = true;
    try {
      emailValid = validateEmail(sanitizedEmail);
    } catch (validateError: any) {
      log.error('Error validating email', validateError);
      emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail);
    }

    if (!emailValid) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 400 });
    }

    log.debug('Attempting to authenticate admin', { email: sanitizedEmail });

    // Force admin role only
    const targetRole = 'admin';

    // Check if username is blocked
    let usernameBlocked = false;
    try {
      usernameBlocked = isUsernameBlocked(sanitizedEmail);
    } catch (blockError: any) {
      log.error('Error checking username block', blockError);
    }

    if (usernameBlocked) {
      try {
        securityLogger.info('Blocked username attempted admin login', { email: sanitizedEmail, ip: clientIP });
      } catch (logError) {
        log.error('Error logging security event', logError);
      }
      return NextResponse.json(
        { message: 'Too many failed login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate as admin
    log.debug('Target role for authentication', { role: targetRole, email: sanitizedEmail });

    // First, check if user exists in database (for better diagnostics and auto-fix)
    let dbUser: any = null;
    try {
      const { getDatabaseWithRetry } = await import('@/lib/db');
      const { users } = await import('@/lib/db/schema');
      const { eq } = await import('drizzle-orm');
      const db = await getDatabaseWithRetry();

      const dbUsers = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.email, sanitizedEmail))
        .limit(5); // Get all accounts for this email

      log.debug('Database query result', {
        email: sanitizedEmail,
        accountsFound: dbUsers.length,
        accounts: dbUsers.map((u: any) => ({ id: u.id, role: u.role, isActive: u.isActive }))
      });

      // Find admin account specifically
      dbUser = dbUsers.find((u: any) => u.role === 'admin');

      // Auto-fix: If admin user exists but is inactive, activate them
      if (dbUser && !dbUser.isActive && dbUser.role === 'admin') {
        log.warn('Auto-fixing inactive admin account', { userId: dbUser.id, email: sanitizedEmail });
        try {
          await db
            .update(users)
            .set({ isActive: true })
            .where(eq(users.id, dbUser.id));
          log.info('Admin account activated automatically', { userId: dbUser.id });
          dbUser.isActive = true; // Update local reference
        } catch (fixError: any) {
          log.error('Error auto-fixing admin account', fixError);
        }
      }
    } catch (dbError: any) {
      log.error('Error querying database for user', dbError);
      // Continue with authentication attempt
    }

    let user;
    try {
      user = await authenticateUser(sanitizedEmail, password, targetRole);
      log.debug('authenticateUser result', {
        found: !!user,
        userId: user?.id,
        role: user?.role,
        isActive: user?.isActive
      });
    } catch (authError: any) {
      log.error('Error in authenticateUser', authError, {
        message: authError.message,
        stack: authError.stack,
        email: sanitizedEmail,
      });
      return NextResponse.json(
        {
          message: 'Authentication failed',
          error: process.env.NODE_ENV === 'development' ? authError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!user) {
      // Provide more helpful error message based on database check
      let errorMessage = 'Invalid email or password';
      if (dbUser) {
        if (dbUser.role !== 'admin') {
          errorMessage = 'This email is registered as a student account. Please use the student login page.';
        } else if (!dbUser.isActive) {
          errorMessage = 'Your admin account exists but is not active. Please contact an administrator.';
        }
      }

      log.warn('Admin authentication failed', {
        email: sanitizedEmail,
        reason: 'Invalid credentials or user not found',
        targetRole,
        dbUserExists: !!dbUser,
        dbUserRole: dbUser?.role,
        dbUserIsActive: dbUser?.isActive
      });

      // Record failed attempt
      let attemptResult: any = { remainingAttempts: 5, delayMs: 0, blocked: false };
      try {
        attemptResult = recordFailedAttempt(clientIP, sanitizedEmail);
      } catch (recordError: any) {
        log.error('Error recording failed attempt', recordError);
      }

      try {
        securityLogger.info('failed_auth', { ip: clientIP, email: sanitizedEmail, reason: 'Invalid credentials' });
      } catch (logError) {
        log.error('Error logging failed auth', logError);
      }

      try {
        reportSecurityIncident(clientIP, 'Failed admin login attempt', { email: sanitizedEmail }, 'low');
      } catch (reportError) {
        log.error('Error reporting security incident', reportError);
      }

      // Add delay for failed attempt
      if (attemptResult.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, attemptResult.delayMs));
      }

      const response = NextResponse.json(
        {
          message: errorMessage,
          remainingAttempts: attemptResult.remainingAttempts,
          ...(attemptResult.blocked && {
            blocked: true,
            blockDuration: Math.ceil((attemptResult.blockDuration || 0) / 1000 / 60), // minutes
          }),
        },
        { status: 401 }
      );

      return response;
    }

    // Verify user is actually an admin (this should never happen if authenticateUser works correctly)
    if (user.role !== 'admin') {
      log.error('CRITICAL: authenticateUser returned non-admin user for admin login', {
        email: sanitizedEmail,
        userRole: user.role,
        expectedRole: 'admin',
        userId: user.id,
        isActive: user.isActive
      });
      return NextResponse.json(
        {
          message: 'This endpoint is for admin accounts only. Your account role is: ' + user.role,
          error: process.env.NODE_ENV === 'development' ? `Expected admin role but got ${user.role}` : undefined
        },
        { status: 403 }
      );
    }

    log.info('Admin authenticated successfully', { userId: user.id, email: user.email, role: user.role, isActive: user.isActive });

    // Double-check isActive (should already be true from authenticateUser WHERE clause, but verify)
    if (!user.isActive) {
      log.error('CRITICAL: authenticateUser returned inactive user', {
        email: user.email,
        userId: user.id,
        isActive: user.isActive,
        role: user.role
      });
      return NextResponse.json(
        {
          message: 'Account is deactivated. Please contact administrator.',
          error: process.env.NODE_ENV === 'development' ? 'User isActive is false' : undefined
        },
        { status: 403 }
      );
    }

    // Record successful login
    try {
      recordSuccessfulLogin(clientIP, sanitizedEmail);
    } catch (recordError: any) {
      log.error('Error recording successful login', recordError);
    }

    try {
      securityLogger.info('successful_auth', { ip: clientIP, email: sanitizedEmail, role: 'admin' });
    } catch (logError) {
      log.error('Error logging successful auth', logError);
    }

    // Create session with user data
    log.debug('Creating session', { userId: user.id });
    let sessionToken: string;
    try {
      sessionToken = await createSession(user.id, undefined, user);
      log.debug('Session created', { tokenLength: sessionToken.length });
    } catch (sessionError: any) {
      log.error('Error creating session', sessionError, {
        message: sessionError.message,
        stack: sessionError.stack,
      });
      // Fallback to JWT token if session creation fails
      try {
        const { generateToken } = await import('@/lib/auth');
        sessionToken = generateToken(user);
        log.warn('Using JWT token as fallback');
      } catch (tokenError: any) {
        log.error('Error generating fallback token', tokenError);
        return NextResponse.json(
          {
            message: 'Failed to create session',
            error: process.env.NODE_ENV === 'development' ? sessionError.message : undefined
          },
          { status: 500 }
        );
      }
    }

    // Update last login timestamp and IP address
    try {
      const db = await getDatabaseWithRetry();
      await db
        .update(users)
        .set({
          lastLogin: new Date(),
          lastLoginIp: clientIP,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      log.debug('Last login updated', { userId: user.id, ip: clientIP });
    } catch (updateError: any) {
      log.error('Error updating last login', updateError);
      // Don't fail the login if this update fails
    }

    // Set cookie expiration based on rememberMe
    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60  // 30 days if remember me is checked
      : 7 * 24 * 60 * 60;  // 7 days default

    // Always redirect to admin dashboard
    const redirectUrl = '/admin/dashboard';
    log.info('Admin login successful', { redirectUrl, rememberMe });

    // Return JSON response with redirect URL
    const jsonResponse = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        bio: user.bio || null,
        role: user.role,
        isActive: user.isActive,
        fingerprintEnrolled: user.fingerprintEnrolled || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        joinedDate: user.joinedDate ? new Date(user.joinedDate).toISOString() : null,
      },
      redirectUrl: redirectUrl,
    });

    // Set admin_token cookie with production-ready secure setting
    jsonResponse.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https'), // Secure only if production AND https
      path: '/',
      maxAge: maxAge,
    });

    // Backward compatibility: some API routes still read `token`
    jsonResponse.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https'),
      path: '/',
      maxAge: maxAge,
    });

    log.debug('Admin login response prepared', { userId: user.id, role: user.role });

    return jsonResponse;
  } catch (error: any) {
    log.error('Admin login API error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}
