import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !['student', 'admin'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role. Must be either "student" or "admin"' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      name,
      email,
      password,
      phone,
      role: role || 'student', // Use provided role or default to student
    });

    // Send welcome email (optional - remove if not needed)
    try {
      await sendWelcomeEmail(email, name);
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
        role: user.role,
      },
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle unique constraint violations
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
