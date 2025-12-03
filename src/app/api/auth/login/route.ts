import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';
import {
  sanitizeString,
  validateEmail,
  getClientIP,
  rateLimit,
  validateBodySize,
} from '@/lib/security';
import {
  isIPBlocked,
  isUsernameBlocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '@/lib/brute-force-protection';
import { reportSecurityIncident } from '@/lib/threat-detection';
import { securityLogger } from '@/lib/edge-logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for login (with error handling)
    let clientIP: string;
    try {
      clientIP = getClientIP(request);
    } catch (ipError: any) {
      console.error('❌ Error getting client IP:', ipError);
      clientIP = 'unknown';
    }

    // Check brute force protection (with error handling)
    let isBlocked = false;
    try {
      isBlocked = isIPBlocked(clientIP);
    } catch (blockError: any) {
      console.error('❌ Error checking IP block:', blockError);
      // Continue with login if block check fails
    }

    if (isBlocked) {
      try {
        securityLogger.info('Blocked IP attempted login', { ip: clientIP });
      } catch (logError) {
        console.error('❌ Error logging security event:', logError);
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
      console.error('❌ Error in rate limiting:', rateError);
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
      console.error('❌ Error reading request body:', bodyError);
      return NextResponse.json({ message: 'Failed to read request body' }, { status: 400 });
    }

    let bodySizeValid = true;
    try {
      bodySizeValid = validateBodySize(body, 512); // 512 bytes max
    } catch (sizeError: any) {
      console.error('❌ Error validating body size:', sizeError);
      // Continue if validation fails
    }

    if (!bodySizeValid) {
      return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const { email, password } = data;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Sanitize and validate email (with error handling)
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
    } catch (sanitizeError: any) {
      console.error('❌ Error sanitizing email:', sanitizeError);
      sanitizedEmail = email.toLowerCase().trim();
    }

    let emailValid = true;
    try {
      emailValid = validateEmail(sanitizedEmail);
    } catch (validateError: any) {
      console.error('❌ Error validating email:', validateError);
      // Basic email validation fallback
      emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail);
    }

    if (!emailValid) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 400 });
    }

    console.log('Attempting to authenticate user:', sanitizedEmail);
    console.log('Received role from client:', data.role);
    console.log('Role type:', typeof data.role);

    // Check if user has multiple accounts (roles) with this email (with error handling)
    let allAccounts: any[] = [];
    try {
      const { getUserAccounts } = await import('@/lib/auth');
      allAccounts = await getUserAccounts(sanitizedEmail);
    } catch (accountsError: any) {
      console.error('❌ Error getting user accounts:', accountsError);
      // If getUserAccounts fails, try to authenticate directly
      // This is a fallback for when the function fails
      console.log('⚠️ Falling back to direct authentication');
    }
    console.log('All accounts found:', allAccounts.length);
    console.log(
      'Accounts:',
      allAccounts.map((a) => ({ role: a.role, name: a.name }))
    );

    // Only show multiple accounts selector if role is 'auto', undefined, or not specified
    // If user explicitly selected 'student' or 'admin', login directly with that role
    const hasExplicitRole =
      data.role && data.role !== 'auto' && (data.role === 'student' || data.role === 'admin');
    const isAutoRole = !hasExplicitRole; // If no explicit role, treat as 'auto'

    console.log('Has explicit role:', hasExplicitRole);
    console.log('Is auto role:', isAutoRole);

    // If explicit role is provided, filter accounts to only that role
    // This ensures student login only checks student accounts, admin login only checks admin accounts
    const relevantAccounts = hasExplicitRole
      ? allAccounts.filter((acc) => acc.role === data.role)
      : allAccounts;

    console.log('Relevant accounts (filtered by role):', relevantAccounts.length);
    console.log(
      'Relevant accounts:',
      relevantAccounts.map((a) => ({ role: a.role, name: a.name }))
    );

    // Only show multiple accounts selector if:
    // 1. No explicit role was provided (auto mode)
    // 2. AND there are multiple accounts of different roles
    if (allAccounts.length > 1 && isAutoRole) {
      // Multiple accounts and user selected 'auto' or didn't specify - show selector
      console.log('Showing multiple accounts selector');
      return NextResponse.json(
        {
          message: 'Multiple accounts found. Please select a role.',
          hasMultipleRoles: true,
          accounts: allAccounts.map((acc) => ({
            id: acc.id,
            role: acc.role,
            name: acc.name,
          })),
        },
        { status: 200 }
      ); // 200 because we want to show the role selector
    }

    // If explicit role is provided but no account exists for that role, return error
    if (hasExplicitRole && relevantAccounts.length === 0) {
      console.log('No account found for explicit role:', data.role);
      return NextResponse.json(
        {
          message: `No ${data.role} account found with this email. Please check your credentials or register a ${data.role} account.`,
        },
        { status: 404 }
      );
    }

    // Check if username is blocked (with error handling)
    let usernameBlocked = false;
    try {
      usernameBlocked = isUsernameBlocked(sanitizedEmail);
    } catch (blockError: any) {
      console.error('❌ Error checking username block:', blockError);
      // Continue if check fails
    }

    if (usernameBlocked) {
      try {
        securityLogger.info('Blocked username attempted login', {
          email: sanitizedEmail,
          ip: clientIP,
        });
      } catch (logError) {
        console.error('❌ Error logging security event:', logError);
      }
      return NextResponse.json(
        { message: 'Too many failed login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate with specific role if provided, or first account if only one
    // When explicit role is provided, use it directly (authenticateUser will filter by role)
    // When auto mode, use the first account from relevant accounts
    const targetRole = hasExplicitRole
      ? data.role
      : relevantAccounts.length > 0
        ? relevantAccounts[0].role
        : undefined;
    console.log('Target role for authentication:', targetRole);

    let user;
    try {
      user = await authenticateUser(sanitizedEmail, password, targetRole);
    } catch (authError: any) {
      console.error('❌ Error in authenticateUser:', authError);
      console.error('Auth error details:', {
        message: authError.message,
        stack: authError.stack,
      });
      // Return a more specific error
      return NextResponse.json(
        {
          message: 'Authentication failed',
          error: process.env.NODE_ENV === 'development' ? authError.message : undefined,
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.log('Authentication failed: Invalid email or password');

      // Record failed attempt (with error handling)
      let attemptResult: any = { remainingAttempts: 5, delayMs: 0, blocked: false };
      try {
        attemptResult = recordFailedAttempt(clientIP, sanitizedEmail);
      } catch (recordError: any) {
        console.error('❌ Error recording failed attempt:', recordError);
      }

      try {
        securityLogger.info('failed_auth', {
          ip: clientIP,
          email: sanitizedEmail,
          reason: 'Invalid credentials',
        });
      } catch (logError) {
        console.error('❌ Error logging failed auth:', logError);
      }

      try {
        reportSecurityIncident(clientIP, 'Failed login attempt', { email: sanitizedEmail }, 'low');
      } catch (reportError) {
        console.error('❌ Error reporting security incident:', reportError);
      }

      // Add delay for failed attempt (progressive delay)
      if (attemptResult.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, attemptResult.delayMs));
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

    console.log('User authenticated:', { id: user.id, email: user.email, role: user.role });

    if (!user.isActive) {
      console.log('Account is deactivated:', user.email);
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Record successful login (clear failed attempts) (with error handling)
    try {
      recordSuccessfulLogin(clientIP, sanitizedEmail);
    } catch (recordError: any) {
      console.error('❌ Error recording successful login:', recordError);
    }

    try {
      securityLogger.info('successful_auth', { ip: clientIP, email: sanitizedEmail });
    } catch (logError) {
      console.error('❌ Error logging successful auth:', logError);
    }

    // Create session with user data (with error handling)
    console.log('Creating session for user:', user.id);
    let sessionToken: string;
    try {
      sessionToken = await createSession(user.id, undefined, user);
      console.log('Session created, token length:', sessionToken.length);
    } catch (sessionError: any) {
      console.error('❌ Error creating session:', sessionError);
      console.error('Session error details:', {
        message: sessionError.message,
        stack: sessionError.stack,
      });
      // Fallback to JWT token if session creation fails
      try {
        const { generateToken } = await import('@/lib/auth');
        sessionToken = generateToken(user);
        console.log('⚠️ Using JWT token as fallback');
      } catch (tokenError: any) {
        console.error('❌ Error generating fallback token:', tokenError);
        return NextResponse.json(
          {
            message: 'Failed to create session',
            error: process.env.NODE_ENV === 'development' ? sessionError.message : undefined,
          },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });

    // Set HttpOnly cookie for token with secure settings
    // Using 'lax' instead of 'strict' to allow redirects after login
    // In development, we don't use secure flag to allow http://localhost
    response.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax', // 'lax' allows redirects while still providing CSRF protection
      secure: false, // Set to false for localhost development
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    console.log('✓ Cookie set for user:', user.email);
    console.log('✓ Response prepared with user data:', { id: user.id, role: user.role });

    // Determine redirect URL
    const redirectUrl = user.role === 'admin' ? '/admin' : '/student';
    console.log('=== LOGIN API SUCCESS - Redirecting to:', redirectUrl);

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
        faceIdEnrolled: user.faceIdEnrolled || false,
        fingerprintEnrolled: user.fingerprintEnrolled || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        joinedDate: user.joinedDate ? new Date(user.joinedDate).toISOString() : null,
      },
      redirectUrl: redirectUrl,
    });

    // Set cookie in JSON response
    jsonResponse.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax', // 'lax' allows redirects while still providing CSRF protection
      secure: false, // Set to false for localhost development (http://)
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: undefined, // Don't set domain for localhost
    });

    console.log('✓ Cookie set in JSON response for user:', user.email);
    console.log('✓ Redirect URL in response:', redirectUrl);

    return jsonResponse;
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    // Handle database connection errors
    if (
      error?.message?.includes('DATABASE_URL') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED'
    ) {
      return NextResponse.json(
        {
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json(
        {
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
