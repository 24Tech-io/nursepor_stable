import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { sanitizeString, validateEmail, validatePassword, validatePhone, getClientIP, rateLimit, validateBodySize } from '@/lib/security';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`admin-register:${clientIP}`, 5, 15 * 60 * 1000); // 5 requests per 15 minutes
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
      log.debug('Phone validation failed', { phone: sanitizedPhone });
      return NextResponse.json(
        { message: 'Invalid phone number format. Please use 10-20 digits with optional spaces, dashes, or parentheses.' },
        { status: 400 }
      );
    }
    
    log.debug('Phone number processed', { phone: sanitizedPhone });

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.error },
        { status: 400 }
      );
    }

    // Force admin role only - admin registration endpoint
    const finalRole = 'admin';

    log.debug('Attempting to create admin user', { name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone, role: finalRole });
    
    // Check if admin account with this email already exists
    try {
      const { getUserAccounts } = await import('@/lib/auth');
      const existingAccounts = await getUserAccounts(sanitizedEmail);
      const existingAdminAccount = existingAccounts.find(acc => acc.role === finalRole);
      
      if (existingAdminAccount) {
        return NextResponse.json(
          { message: `An admin account with this email already exists. Please use a different email or try logging in.` },
          { status: 409 }
        );
      }
    } catch (checkError: any) {
      log.warn('getUserAccounts check failed, proceeding with registration', { error: checkError.message });
      // Continue with registration - let database unique constraint handle duplicates
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
      log.info('Admin user created successfully', { id: user.id, email: user.email, phone: user.phone, role: user.role });
    } catch (createError: any) {
      log.error('createUser error', createError);
      log.error('createUser error details', {
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
      log.error('Failed to send welcome email', emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      message: 'Admin registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (error: any) {
    log.error('Admin registration error', error);
    log.error('Error details', {
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
    
    log.debug('Checking for duplicate email+role error', {
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
      log.debug('Duplicate email+role detected - returning user-friendly message');
      // Try to extract role from error or use 'admin' as default
      const attemptedRole = 'admin'; // Default since we can't access role in catch block
      return NextResponse.json(
        { message: `An admin account with this email already exists. You can create a different role account with the same email, or try logging in.` },
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
        message: 'Admin registration failed. Please try again or contact support if the problem persists.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
