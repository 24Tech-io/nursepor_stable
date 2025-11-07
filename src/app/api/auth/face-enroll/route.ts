import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { descriptorToBase64 } from '@/lib/face-recognition';

export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult.user;

  // Get database instance
  const db = getDatabase();

  try {
    const { descriptor } = await request.json();

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json(
        { error: 'Face descriptor is required' },
        { status: 400 }
      );
    }

    // Convert array to Float32Array and then to base64
    const float32Array = new Float32Array(descriptor);
    const faceTemplate = descriptorToBase64(float32Array);

    // Update user with face template
    await db
      .update(users)
      .set({
        faceIdEnrolled: true,
        faceTemplate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: 'Face enrolled successfully',
      success: true,
    });
  } catch (error: any) {
    console.error('Face enrollment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enroll face',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

