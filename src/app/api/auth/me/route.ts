import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for both admin and student tokens
    const { searchParams } = new URL(request.url);
    const authType = searchParams.get('type'); // 'admin' | 'student' | null

    // Check for both admin and student tokens
    const adminToken = request.cookies.get('adminToken')?.value;
    const studentToken = request.cookies.get('studentToken')?.value;

    let token;

    // Strict Mode: If type is specified, ONLY check that specific token
    if (authType === 'student') {
      token = studentToken;
    } else if (authType === 'admin') {
      token = adminToken;
    } else {
      // Default / Legacy Mode: Check Admin first, then Student (fallback)
      token = adminToken || studentToken;
    }

    // During build time, this is expected to have no token (static page generation)
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Double-check role matches requested type (if strict)
    if (authType && decoded.role !== authType) {
      return NextResponse.json({ message: 'Unauthorized role' }, { status: 403 });
    }

    // Fetch fresh user data from database
    // relying on token payload is bad because it's stale and limited (doesn't have phone, bio, etc)
    const db = getDatabase();
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Return full user profile (excluding sensitive data)
    // Ensure phone is returned as string or null (not empty string)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone && user.phone.trim() ? user.phone.trim() : null, // Return null for empty strings
        bio: user.bio && user.bio.trim() ? user.bio.trim() : null,
        role: user.role,
        isActive: user.isActive,
        profilePicture: user.profilePicture,
        faceIdEnrolled: user.faceIdEnrolled,
        fingerprintEnrolled: user.fingerprintEnrolled,
        twoFactorEnabled: user.twoFactorEnabled,
        joinedDate: user.joinedDate,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ [/api/auth/me] Error:', error);
    return NextResponse.json(
      { message: 'Authentication failed', error: error.message },
      { status: 500 }
    );
  }
}
