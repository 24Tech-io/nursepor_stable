import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { password, enable } = await request.json();

    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ message: 'Incorrect password' }, { status: 401 });
    }

    // Update 2FA status
    await db.update(users)
      .set({ twoFactorEnabled: enable })
      .where(eq(users.id, decoded.userId));

    return NextResponse.json({
      success: true,
      message: enable ? 'Two-Factor Authentication enabled successfully' : 'Two-Factor Authentication disabled successfully',
      twoFactorEnabled: enable,
    });

  } catch (error) {
    logger.error('Toggle 2FA error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}









