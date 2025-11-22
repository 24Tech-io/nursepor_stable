import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { sanitizeString, validateEmail, validatePassword, validatePhone, getClientIP, rateLimit, validateBodySize } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`register:${clientIP}`, 5, 15 * 60 * 1000); // 5 requests per 15 minutes
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Please try again later.' },
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
    if (!validateBodySize(body, 1024)) { // 1KB max
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
    const { name, email, phone, password, role } = data;

    // Input validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
    // Handle phone: trim whitespace, if empty string set to null, otherwise sanitize
    const sanitizedPhone = phone && phone.trim() ? sanitizeString(phone.trim(), 20) : null;

    // Validate email
    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
      console.log('Phone validation failed for:', sanitizedPhone);
      return NextResponse.json(
        { message: 'Invalid phone number format. Please use 10-20 digits with optional spaces, dashes, or parentheses.' },
        { status: 400 }
      );
    }
    
    console.log('Phone number after processing:', sanitizedPhone);

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.error },
        { status: 400 }
      );
    }

    // Force student role only - no admin registration on student portal
    const finalRole = 'student';

    console.log('Attempting to create user:', { name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone, role: finalRole });
    
    // Check if account with this email+role already exists
    const { getUserAccounts } = await import('@/lib/auth');
    const existingAccounts = await getUserAccounts(sanitizedEmail);
    const existingRole = existingAccounts.find(acc => acc.role === finalRole);
    
    if (existingRole) {
      return NextResponse.json(
        { message: `An account with this email already exists as ${finalRole}. Please use a different email or try logging in.` },
        { status: 409 }
      );
    }
    
    // Create user
    let user;
    try {
      user = await createUser({
        name: sanitizedName,
        email: sanitizedEmail,
        password,
        phone: sanitizedPhone || undefined,
        role: finalRole,
      });
      console.log('User created successfully:', { id: user.id, email: user.email, phone: user.phone, role: user.role });
    } catch (createError: any) {
      console.error('createUser error:', createError);
      console.error('createUser error details:', {
        message: createError?.message,
        code: createError?.code,
        detail: createError?.detail,
        stack: createError?.stack,
      });
      // Re-throw to be caught by outer catch block
      throw createError;
    }

    // Send welcome email (optional - remove if not needed)
    try {
      await sendWelcomeEmail(sanitizedEmail, sanitizedName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack,
    });

    // Handle unique constraint violations
    // Now checks for (email, role) composite unique constraint
    const errorCode = error?.code || error?.cause?.code;
    const errorMessage = (error?.message || '').toLowerCase();
    const errorDetail = (error?.detail || error?.cause?.detail || '').toLowerCase();
    const errorConstraint = error?.constraint || error?.cause?.constraint || '';
    
    console.log('Checking for duplicate email+role error:', {
      errorCode,
      errorMessage: errorMessage.substring(0, 100),
      errorDetail: errorDetail.substring(0, 100),
      errorConstraint,
      hasCause: !!error?.cause,
      causeCode: error?.cause?.code,
    });
    
    // Check for composite unique constraint violation (email + role)
    const isDuplicateEmailRole = 
      errorCode === '23505' ||
      errorMessage.includes('duplicate key') || 
      errorMessage.includes('unique constraint') ||
      errorDetail.includes('already exists') ||
      errorConstraint === 'users_email_role_unique' ||
      error?.cause?.code === '23505';
    
    if (isDuplicateEmailRole) {
      console.log('✓ Duplicate email+role detected - returning user-friendly message');
      // Try to extract role from error or use 'student' as default
      const attemptedRole = 'student'; // Default since we can't access role in catch block
      return NextResponse.json(
        { message: `An account with this email already exists. You can create a different role account with the same email, or try logging in.` },
        { status: 409 }
      );
    }

    // Handle database connection errors
    const dbConnectionError = 
      error?.message?.includes('DATABASE_URL') || 
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED' ||
      error?.cause?.code === 'ECONNREFUSED';
    
    if (dbConnectionError) {
      return NextResponse.json(
        { 
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    const tableNotFoundError = 
      error?.message?.includes('does not exist') || 
      error?.code === '42P01' ||
      error?.cause?.code === '42P01';
    
    if (tableNotFoundError) {
      return NextResponse.json(
        { 
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Generic error - return user-friendly message
    return NextResponse.json(
      { 
        message: 'Registration failed. Please try again or contact support if the problem persists.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
