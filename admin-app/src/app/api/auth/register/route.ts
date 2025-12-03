import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

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

    const db = getDatabase();

    // Check if admin account with this email already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.role, 'admin')))
      .limit(1);

    if (existingAdmin.length > 0) {
      return NextResponse.json(
        { message: 'An admin account with this email already exists' },
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
