import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateToken } from '@/lib/auth';

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

// Helper to convert base64 to Float32Array
function base64ToFloat32Array(base64: string): Float32Array {
  try {
    // Try parsing as JSON first (for simple-face-auth format)
    try {
      const jsonData = JSON.parse(atob(base64));
      if (Array.isArray(jsonData)) {
        return new Float32Array(jsonData);
      }
    } catch (e) {
      // Not JSON, try as binary
    }

    // Parse as binary data
    const buffer = Buffer.from(base64, 'base64');
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  } catch (error) {
    console.error('Error converting base64 to Float32Array:', error);
    throw new Error('Invalid face template format');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, descriptor, faceTemplate } = await request.json();

    if (!email || (!descriptor && !faceTemplate)) {
      return NextResponse.json({ message: 'Email and face data are required' }, { status: 400 });
    }

    const db = getDatabase();

    // Get admin user from database
    const userResult = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase().trim()),
          eq(users.role, 'admin'),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ message: 'Admin user not found' }, { status: 404 });
    }

    const user = userResult[0];

    if (!user.faceIdEnrolled || !user.faceTemplate) {
      return NextResponse.json(
        { message: 'Face ID not enrolled for this account' },
        { status: 400 }
      );
    }

    // Convert stored template to Float32Array
    let storedDescriptor: Float32Array;
    try {
      storedDescriptor = base64ToFloat32Array(user.faceTemplate);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid stored face template' }, { status: 500 });
    }

    // Convert provided descriptor
    let providedDescriptor: Float32Array;
    if (faceTemplate) {
      // From simple-face-auth format
      try {
        const jsonData = JSON.parse(atob(faceTemplate));
        if (Array.isArray(jsonData)) {
          providedDescriptor = new Float32Array(jsonData);
        } else {
          return NextResponse.json({ message: 'Invalid face template format' }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ message: 'Invalid face template format' }, { status: 400 });
      }
    } else if (descriptor && Array.isArray(descriptor)) {
      providedDescriptor = new Float32Array(descriptor);
    } else {
      return NextResponse.json({ message: 'Invalid face descriptor format' }, { status: 400 });
    }

    // Calculate distance
    const distance = calculateEuclideanDistance(storedDescriptor, providedDescriptor);
    const threshold = 0.6; // Slightly higher threshold for admin
    const match = distance < threshold;

    if (!match) {
      return NextResponse.json(
        { message: 'Face verification failed. Please try again.' },
        { status: 401 }
      );
    }

    // Generate admin token
    const adminToken = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    const response = NextResponse.json({
      message: 'Face login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set adminToken cookie
    response.cookies.set('adminToken', adminToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

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




