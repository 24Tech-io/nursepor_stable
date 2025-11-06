import { NextRequest, NextResponse } from 'next/server';
import { getUserAccounts } from '@/lib/auth';
import { sanitizeString, validateEmail, getClientIP, rateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`get-roles:${clientIP}`, 10, 60 * 1000); // 10 requests per minute
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Sanitize and validate email
    const sanitizedEmail = sanitizeString(email.toLowerCase(), 255);
    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get all accounts for this email
    const accounts = await getUserAccounts(sanitizedEmail);

    return NextResponse.json({
      email: sanitizedEmail,
      accounts: accounts.map(acc => ({
        id: acc.id,
        role: acc.role,
        name: acc.name,
      })),
      hasMultipleRoles: accounts.length > 1,
    });
  } catch (error: any) {
    console.error('Get roles error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get user roles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

