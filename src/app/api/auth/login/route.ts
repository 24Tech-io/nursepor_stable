import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';
import { sanitizeString, validateEmail, getClientIP, rateLimit, validateBodySize } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for login
    const clientIP = getClientIP(request);
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

    console.log('Attempting to authenticate user:', email);
    console.log('Received role from client:', data.role);
    console.log('Role type:', typeof data.role);
    
    // Check if user has multiple accounts (roles) with this email
    const { getUserAccounts } = await import('@/lib/auth');
    const allAccounts = await getUserAccounts(email);
    console.log('All accounts found:', allAccounts.length);
    console.log('Accounts:', allAccounts.map(a => ({ role: a.role, name: a.name })));
    
    // Only show multiple accounts selector if role is 'auto', undefined, or not specified
    // If user explicitly selected 'student' or 'admin', login directly with that role
    const hasExplicitRole = data.role && data.role !== 'auto' && (data.role === 'student' || data.role === 'admin');
    const isAutoRole = !hasExplicitRole; // If no explicit role, treat as 'auto'
    
    console.log('Has explicit role:', hasExplicitRole);
    console.log('Is auto role:', isAutoRole);
    
    if (allAccounts.length > 1 && isAutoRole) {
      // Multiple accounts and user selected 'auto' or didn't specify - show selector
      console.log('Showing multiple accounts selector');
      return NextResponse.json({
        message: 'Multiple accounts found. Please select a role.',
        hasMultipleRoles: true,
        accounts: allAccounts.map(acc => ({
          id: acc.id,
          role: acc.role,
          name: acc.name,
        })),
      }, { status: 200 }); // 200 because we want to show the role selector
    }
    
    // Authenticate with specific role if provided, or first account if only one
    const targetRole = hasExplicitRole ? data.role : (allAccounts.length > 0 ? allAccounts[0].role : undefined);
    console.log('Target role for authentication:', targetRole);
    const user = await authenticateUser(email, password, targetRole);

    if (!user) {
      console.log('Authentication failed: Invalid email or password');
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', { id: user.id, email: user.email, role: user.role });

    if (!user.isActive) {
      console.log('Account is deactivated:', user.email);
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Create session with user data
    console.log('Creating session for user:', user.id);
    const sessionToken = await createSession(user.id, undefined, user);
    console.log('Session created, token length:', sessionToken.length);

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
