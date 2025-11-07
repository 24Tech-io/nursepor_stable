import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
import { base64ToDescriptor } from '@/lib/face-recognition';
import { verifyFace } from '@/lib/face-recognition';

// Note: This is a simplified version. In production, you'd need to:
// 1. Receive video frame or image from client
// 2. Process it server-side or use client-side verification
// 3. For security, consider using a challenge-response system

export async function POST(request: NextRequest) {
  try {
    const { email, descriptor } = await request.json();

    if (!email || !descriptor) {
      return NextResponse.json(
        { message: 'Email and face descriptor are required' },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Get user from database
    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true)))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult[0];

    if (!user.faceIdEnrolled || !user.faceTemplate) {
      return NextResponse.json(
        { message: 'Face ID not enrolled for this account' },
        { status: 400 }
      );
    }

    // Convert stored template back to Float32Array
    const storedDescriptor = base64ToDescriptor(user.faceTemplate);
    const providedDescriptor = new Float32Array(descriptor);

    // Calculate distance (simplified - in production, do this server-side with proper image processing)
    // For now, we'll do a basic comparison
    // In production, you should:
    // 1. Receive actual image/video frame
    // 2. Process it server-side using face-api.js or similar
    // 3. Compare descriptors server-side

    const distance = calculateEuclideanDistance(storedDescriptor, providedDescriptor);
    const threshold = 0.5;
    const match = distance < threshold;

    if (!match) {
      return NextResponse.json(
        { message: 'Face verification failed' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession(user.id);

    const response = NextResponse.json({
      message: 'Face login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set secure cookie
    response.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    return response;
  } catch (error: any) {
    console.error('Face login error:', error);
    return NextResponse.json(
      {
        message: 'Face login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate Euclidean distance
function calculateEuclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

