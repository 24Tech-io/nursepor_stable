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
import { securityLogger } from '@/lib/edge-logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for login
    const clientIP = getClientIP(request);
    
    // Check brute force protection
    if (isIPBlocked(clientIP)) {
      securityLogger.logSecurityEvent('Blocked IP attempted login', { ip: clientIP });
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
    if (!validateBodySize(body, 512)) { // 512 bytes max
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
    let { email, password } = data;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sanitize and validate email
    email = sanitizeString(email.toLowerCase(), 255);
    if (!validateEmail(email)) {
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

    console.log('Attempting to authenticate admin:', email);
    
    // Force admin role only
    const targetRole = 'admin';
    
    // Check if username is blocked
    if (isUsernameBlocked(email)) {
      securityLogger.logSecurityEvent('Blocked username attempted login', { email, ip: clientIP });
      return NextResponse.json(
        { message: 'Too many failed login attempts for this account. Please try again later.' },
        { status: 429 }
      );
    }

    // Authenticate with admin role only
    const user = await authenticateUser(email, password, targetRole);

    if (!user) {
      console.log('Authentication failed: Invalid email or password');
      
      // Record failed attempt
      const attemptResult = recordFailedAttempt(clientIP, email);
      securityLogger.logFailedAuth(clientIP, email, 'Invalid credentials');
      reportSecurityIncident(clientIP, 'Failed login attempt', { email }, 'low');
      
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

    console.log('User authenticated:', { id: user.id, email: user.email, role: user.role });

    // Only allow admin role
    if (user.role !== 'admin') {
      return NextResponse.json(
        { message: 'This account is not an admin account.' },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      console.log('Account is deactivated:', user.email);
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Record successful login (clear failed attempts)
    recordSuccessfulLogin(clientIP, email);
    securityLogger.logSuccessfulAuth(clientIP, email);

    // Create session with user data
    console.log('Creating session for user:', user.id);
    const sessionToken = await createSession(user.id, undefined, user);
    console.log('Session created, token length:', sessionToken.length);

    // Always redirect to admin dashboard
    const redirectUrl = '/dashboard';
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
    
    // Set cookie in JSON response
    jsonResponse.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
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
    if (error?.message?.includes('DATABASE_URL') || 
        error?.message?.includes('connection') ||
        error?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { 
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    if (error?.message?.includes('does not exist') || 
        error?.code === '42P01') {
      return NextResponse.json(
        { 
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
