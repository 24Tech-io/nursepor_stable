import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { descriptor, faceTemplate } = await request.json();

    if (!descriptor && !faceTemplate) {
      return NextResponse.json(
        { error: 'Face descriptor or template is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Use faceTemplate if provided (from simple-face-auth), otherwise use descriptor
    let finalTemplate: string;
    if (faceTemplate) {
      finalTemplate = faceTemplate;
    } else if (descriptor && Array.isArray(descriptor)) {
      // Convert array to base64 string
      const float32Array = new Float32Array(descriptor);
      const buffer = Buffer.from(float32Array.buffer);
      finalTemplate = buffer.toString('base64');
    } else {
      return NextResponse.json(
        { error: 'Invalid face data format' },
        { status: 400 }
      );
    }

    // Update admin user with face template
    await db
      .update(users)
      .set({
        faceIdEnrolled: true,
        faceTemplate: finalTemplate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, decoded.id));

    // Log the activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'updated',
      entityType: 'admin',
      entityId: decoded.id,
      entityName: 'Face ID Enrollment',
      details: { action: 'Face ID enrolled successfully' }
    });

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



