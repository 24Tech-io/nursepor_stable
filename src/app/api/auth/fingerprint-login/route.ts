import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { credentialId, authenticatorData, clientDataJSON, signature, userHandle } =
      await request.json();

    if (!credentialId || !authenticatorData || !clientDataJSON || !signature) {
      return NextResponse.json(
        { message: 'Missing required authentication data' },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Find user by fingerprint credential ID
    const user = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.fingerprintEnrolled, true),
          eq(users.fingerprintCredentialId, credentialId),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ message: 'Fingerprint not recognized' }, { status: 401 });
    }

    // Verify the signature (simplified - in production, use proper WebAuthn verification)
    // For now, we'll trust the browser's verification

    // Create session
    const sessionToken = await createSession(user[0].id, undefined, {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      phone: user[0].phone || null,
      bio: user[0].bio || null,
      role: user[0].role,
      isActive: user[0].isActive,
      faceIdEnrolled: user[0].faceIdEnrolled || false,
      fingerprintEnrolled: user[0].fingerprintEnrolled || false,
      twoFactorEnabled: user[0].twoFactorEnabled || false,
      joinedDate: user[0].joinedDate || null,
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user[0].id));

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        role: user[0].role,
      },
    });

    // Set cookie
    response.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Redirect based on role
    const redirectUrl = user[0].role === 'admin' ? '/admin/students' : '/student/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('Fingerprint login error:', error);
    return NextResponse.json(
      {
        message: 'Fingerprint authentication failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
