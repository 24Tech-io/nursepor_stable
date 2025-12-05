import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession, verifyPassword, generateToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
    // Check critical environment variables first
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error('❌ JWT_SECRET is missing or invalid');
      return NextResponse.json(
        { 
          message: 'Server configuration error. JWT_SECRET is missing or invalid.',
          error: process.env.NODE_ENV === 'development' ? 'JWT_SECRET must be at least 32 characters' : undefined
        },
        { status: 500 }
      );
    }

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is missing');
      return NextResponse.json(
        { 
          message: 'Server configuration error. DATABASE_URL is missing.',
          error: process.env.NODE_ENV === 'development' ? 'DATABASE_URL must be set in environment variables' : undefined
        },
        { status: 500 }
      );
    }

    // Rate limiting - stricter for login
    const clientIP = getClientIP(request);

    // Check brute force protection
    if (isIPBlocked(clientIP)) {
      securityLogger.info('Blocked IP attempted login', { ip: clientIP });
      return NextResponse.json(
        { message: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const rateLimitResult = rateLimit(`login:${clientIP}`, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
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
    const body = await request.text();
    if (!validateBodySize(body, 512)) {
      // 512 bytes max
      return NextResponse.json({ message: 'Request body too large' }, { status: 413 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    let { email, password, rememberMe } = data;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Sanitize and validate email
    email = sanitizeString(email.toLowerCase(), 255);
    if (!validateEmail(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 400 });
    }

    console.log('Attempting to authenticate admin:', email);

    // Force admin role only
    const targetRole = 'admin';

    // Check if username is blocked
    if (isUsernameBlocked(email)) {
      securityLogger.info('Blocked username attempted login', { email, ip: clientIP });
      return NextResponse.json(
        { message: 'Too many failed login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate user - will return any account with this email
    const result = await authenticateUser(email, password);
    
    if (!result || !result.user) {
      console.log('Authentication failed: Invalid email or password');

      // Record failed attempt
      const attemptResult = recordFailedAttempt(clientIP, email);
      securityLogger.info('failed_auth', { ip: clientIP, email, reason: 'Invalid credentials' });
      reportSecurityIncident(clientIP, 'Failed login attempt', { email }, 'low');

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

    let user = result.user;

    // If user is not admin, check if there's an admin account with same email
    if (user.role !== 'admin') {
      console.log('First account is student, checking for admin account...');
      
      try {
        const db = getDatabase();
        const adminResult = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), eq(users.role, 'admin')))
          .limit(1);

        if (adminResult.length > 0) {
          // Found admin account, verify password matches
          const isValidPassword = await verifyPassword(password, adminResult[0].password);
          if (isValidPassword) {
            user = {
              id: adminResult[0].id,
              name: adminResult[0].name,
              email: adminResult[0].email,
              phone: adminResult[0].phone,
              bio: adminResult[0].bio,
              role: adminResult[0].role,
              isActive: adminResult[0].isActive,
              faceIdEnrolled: adminResult[0].faceIdEnrolled || false,
              fingerprintEnrolled: adminResult[0].fingerprintEnrolled || false,
              twoFactorEnabled: adminResult[0].twoFactorEnabled || false,
              joinedDate: adminResult[0].createdAt,
            };
            console.log('Found admin account:', { id: user.id, email: user.email, role: user.role });
          } else {
            return NextResponse.json(
              { message: 'This account is not an admin account.' },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { message: 'This account is not an admin account.' },
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error('Error checking for admin account:', dbError);
        return NextResponse.json(
          { message: 'This account is not an admin account.' },
          { status: 403 }
        );
      }
    }

    console.log('User authenticated:', { id: user.id, email: user.email, role: user.role });

    if (!user.isActive) {
      console.log('Account is deactivated:', user.email);
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Record successful login (clear failed attempts)
    recordSuccessfulLogin(clientIP, email);
    securityLogger.info('successful_auth', { ip: clientIP, email });

    // Generate JWT token (matching middleware expectation)
    console.log('Generating JWT token for user:', user.id);
    let token;
    try {
      token = generateToken(user);
      console.log('JWT token generated, length:', token.length);
    } catch (tokenError: any) {
      console.error('❌ Token generation failed:', tokenError);
      return NextResponse.json(
        { 
          message: 'Authentication error. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
        },
        { status: 500 }
      );
    }

    // Always redirect to admin dashboard
    const redirectUrl = '/admin/dashboard';
    console.log('=== LOGIN API SUCCESS - Redirecting to:', redirectUrl);

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

    // Set JWT token cookie with appropriate expiry based on rememberMe
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days vs 7 days

    jsonResponse.cookies.set('adminToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: maxAge,
      path: '/',
      domain: undefined, // Don't set domain for localhost
    });

    console.log('✓ JWT token cookie set for user:', user.email);
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
