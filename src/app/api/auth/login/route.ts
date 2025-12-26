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
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logStudentActivity } from '@/lib/student-activity-log';

export const dynamic = 'force-dynamic';
import { securityLogger } from '@/lib/edge-logger';

// Student login endpoint
// Admin login uses /api/auth/admin-login
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for login (with error handling)
    let clientIP: string;
    try {
      clientIP = getClientIP(request);
    } catch (ipError: any) {
      log.error('Error getting client IP', ipError);
      clientIP = 'unknown';
    }

    // Check brute force protection (with error handling)
    let isBlocked = false;
    try {
      isBlocked = isIPBlocked(clientIP);
    } catch (blockError: any) {
      log.error('Error checking IP block', blockError);
      // Continue with login if block check fails
    }

    if (isBlocked) {
      try {
        securityLogger.info('Blocked IP attempted login', { ip: clientIP });
      } catch (logError) {
        log.error('Error logging security event', logError);
      }
      return NextResponse.json(
        { message: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Rate limiting (with error handling)
    let rateLimitResult: any = { allowed: true };
    try {
      rateLimitResult = rateLimit(`login:${clientIP}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
    } catch (rateError: any) {
      log.error('Error in rate limiting', rateError);
      // Continue with login if rate limiting fails
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

    // Validate request body size (with error handling)
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
      // Continue if validation fails
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
      return NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { email, password, rememberMe } = data;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate email (with error handling)
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
      // Basic email validation fallback
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
      return NextResponse.json(
        { message: 'Invalid password' },
        { status: 400 }
      );
    }

    log.debug('Attempting to authenticate user', { email: sanitizedEmail, requestedRole: data.role });

    // Check if user has multiple accounts (roles) with this email (with error handling)
    let allAccounts: any[] = [];
    try {
      const { getUserAccounts } = await import('@/lib/auth');
      allAccounts = await getUserAccounts(sanitizedEmail);
    } catch (accountsError: any) {
      log.error('Error getting user accounts', accountsError);
      // If getUserAccounts fails, try to authenticate directly
      // This is a fallback for when the function fails
      log.warn('Falling back to direct authentication');
    }
    log.debug('User accounts found', { count: allAccounts.length, accounts: allAccounts.map(a => ({ role: a.role, name: a.name })) });

    // Reject admin role requests - admins should use /api/auth/admin-login
    if (data.role === 'admin') {
      log.warn('Admin login attempt via student endpoint', { email: sanitizedEmail });
      return NextResponse.json({
        message: 'Admin accounts must use the admin login endpoint. Please use /api/auth/admin-login or visit /admin/login',
      }, { status: 400 });
    }

    // Default to student role for this endpoint
    const targetRole = data.role === 'student' ? 'student' : 'student';
    const hasExplicitRole = data.role === 'student';
    const isAutoRole = !hasExplicitRole;

    log.debug('Role selection', { hasExplicitRole, isAutoRole, targetRole });

    // Filter accounts to only student accounts
    const relevantAccounts = allAccounts.filter(acc => acc.role === 'student');

    log.debug('Relevant accounts', { count: relevantAccounts.length, accounts: relevantAccounts.map(a => ({ role: a.role, name: a.name })) });

    // Only show multiple accounts selector if:
    // 1. No explicit role was provided (auto mode)
    // 2. AND there are multiple student accounts
    if (relevantAccounts.length > 1 && isAutoRole) {
      log.debug('Multiple student accounts detected, showing selector');
      return NextResponse.json({
        message: 'Multiple student accounts found. Please select an account.',
        hasMultipleRoles: true,
        accounts: relevantAccounts.map(acc => ({
          id: acc.id,
          role: acc.role,
          name: acc.name,
        })),
      }, { status: 200 });
    }

    // If no student account exists, return error
    if (relevantAccounts.length === 0) {
      log.warn('No student account found', { email: sanitizedEmail });
      return NextResponse.json({
        message: 'No student account found with this email. Please check your credentials or register a student account.',
      }, { status: 404 });
    }

    // Check if username is blocked (with error handling)
    let usernameBlocked = false;
    try {
      usernameBlocked = isUsernameBlocked(sanitizedEmail);
    } catch (blockError: any) {
      log.error('Error checking username block', blockError);
      // Continue if check fails
    }

    if (usernameBlocked) {
      try {
        securityLogger.info('Blocked username attempted login', { email: sanitizedEmail, ip: clientIP });
      } catch (logError) {
        log.error('Error logging security event', logError);
      }
      return NextResponse.json(
        { message: 'Too many failed login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate as student (targetRole is already set to 'student' above)
    log.debug('Target role for authentication', { role: targetRole });

    let user;
    try {
      user = await authenticateUser(sanitizedEmail, password, targetRole);
    } catch (authError: any) {
      log.error('Error in authenticateUser', authError, {
        message: authError.message,
        stack: authError.stack,
      });

      if (!hasDbUrl || !hasJwtSecret) {
        console.error('❌ CRITICAL: Missing environment variables in production!', {
          missingDb: !hasDbUrl,
          missingJwt: !hasJwtSecret
        });
      }
    }

    // Log environment check for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Student login attempt:', {
        email: email.toLowerCase(),
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      });
    }

    // If admin is trying to use this endpoint, redirect them
    if (role === 'admin') {
      return NextResponse.json(
        {
          message: 'Authentication failed',
          error: process.env.NODE_ENV === 'development' ? authError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!user) {
      log.warn('Authentication failed', { email: sanitizedEmail, reason: 'Invalid credentials' });

      // Record failed attempt (with error handling)
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
        reportSecurityIncident(clientIP, 'Failed login attempt', { email: sanitizedEmail }, 'low');
      } catch (reportError) {
        log.error('Error reporting security incident', reportError);
      }

      // Add delay for failed attempt (progressive delay)
      if (attemptResult.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, attemptResult.delayMs));
      }

      const response = NextResponse.json(
        {
          message: 'Invalid email or password',
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

    log.info('User authenticated successfully', { userId: user.id, email: user.email, role: user.role });

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled) {
      log.info('User has 2FA enabled, sending OTP', { userId: user.id });

      // Generate and send OTP
      try {
        const { generateOTP, saveOTP, sendOTPEmail } = await import('@/lib/otp');
        const otpCode = generateOTP();
        await saveOTP(sanitizedEmail, otpCode, 'student');
        await sendOTPEmail(sanitizedEmail, otpCode, user.name || 'User');

        // Generate temp token for 2FA verification
        const jwt = await import('jsonwebtoken');
        const tempToken = jwt.default.sign(
          { userId: user.id, email: sanitizedEmail, purpose: '2fa' },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '10m' }
        );

        return NextResponse.json({
          requires2FA: true,
          tempToken,
          message: 'Two-Factor Authentication required. OTP sent to your email.',
        });
      } catch (otpError: any) {
        log.error('Error sending 2FA OTP', otpError);
        return NextResponse.json(
          { message: 'Failed to send verification code. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (!user.isActive) {
      log.warn('Deactivated account attempted login', { email: user.email });
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate token
    let token;
    try {
      recordSuccessfulLogin(clientIP, sanitizedEmail);
    } catch (recordError: any) {
      log.error('Error recording successful login', recordError);
    }

    try {
      securityLogger.info('successful_auth', { ip: clientIP, email: sanitizedEmail });
    } catch (logError) {
      log.error('Error logging successful auth', logError);
    }

    // Create session with user data (with error handling)
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

    // Always redirect to student dashboard (this endpoint is for students only)
    const redirectUrl = '/student/dashboard';
    log.info('Login successful', { redirectUrl, rememberMe });

    // Return JSON response with redirect URL - let client handle redirect
    // This is more reliable than server-side redirects with fetch
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

    // Set student_token cookie in JSON response with dynamic expiration
    jsonResponse.cookies.set('student_token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax', // 'lax' allows redirects while still providing CSRF protection
      secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https'), // Secure only if production AND https
      path: '/',
      maxAge: maxAge, // Use dynamic maxAge based on rememberMe
      domain: undefined, // Don't set domain for localhost
    });

    // Backward compatibility: some API routes still read `token`
    jsonResponse.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https'),
      path: '/',
      maxAge: maxAge,
    });

    // Log login activity
    try {
      await logStudentActivity({
        studentId: user.id,
        activityType: 'login',
        title: 'User Login',
        description: 'Successful login session started',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (logActivityError) {
      log.error('Error logging login activity', logActivityError);
    }

    log.debug('Login response prepared', { userId: user.id, role: user.role });

    return jsonResponse;

    return response;
  } catch (error: any) {
    log.error('Login API error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}
