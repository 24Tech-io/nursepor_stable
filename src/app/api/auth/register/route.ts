import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { sanitizeString, validateEmail, validatePassword, validatePhone, getClientIP, rateLimit, validateBodySize } from '@/lib/security';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
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

    // Force student role only - no admin registration on student portal
    const finalRole = 'student';

    log.debug('Attempting to create user', { name: sanitizedName, email: sanitizedEmail, phone: sanitizedPhone, role: finalRole });
    
    // Check if account with this email+role already exists
    // Temporarily skip this check to test if createUser works
    try {
      const { getUserAccounts } = await import('@/lib/auth');
      const existingAccounts = await getUserAccounts(sanitizedEmail);
      const existingRole = existingAccounts.find(acc => acc.role === finalRole);
      
      if (existingRole) {
        return NextResponse.json(
          { message: `An account with this email already exists as ${finalRole}. Please use a different email or try logging in.` },
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
      log.info('User created successfully', { id: user.id, email: user.email, phone: user.phone, role: user.role });
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
    log.error('Registration error', error);
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
      // Try to extract role from error or use 'student' as default
      const attemptedRole = 'student'; // Default since we can't access role in catch block
      return NextResponse.json(
        { message: `An account with this email already exists. You can create a different role account with the same email, or try logging in.` },
        { status: 409 }
      );
    }

    // Phone is optional for admin
    const phoneValue = body.phone || null;

    // Create new admin account
    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phoneValue,
        role: 'admin',
        isActive: true,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Admin account created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Admin registration error:', error);
    return NextResponse.json(
      {
        message: 'Failed to create admin account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
