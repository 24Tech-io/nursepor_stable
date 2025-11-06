import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const currentUser = authResult.user;

    const { credentialId, clientDataJSON, attestationObject } = await request.json();

    if (!credentialId || !clientDataJSON || !attestationObject) {
      return NextResponse.json(
        { message: 'Missing required fingerprint data' },
        { status: 400 }
      );
    }

    // Update user with fingerprint credential
    await db
      .update(users)
      .set({
        fingerprintEnrolled: true,
        fingerprintCredentialId: credentialId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json({
      message: 'Fingerprint enrolled successfully',
    });
  } catch (error: any) {
    console.error('Fingerprint enrollment error:', error);
    return NextResponse.json(
      {
        message: 'Failed to enroll fingerprint',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

