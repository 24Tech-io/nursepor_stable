import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

// Route configuration
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const db = getDatabase();

    // Reset face ID enrollment
    const [updatedUser] = await db
      .update(users)
      .set({
        faceIdEnrolled: false,
        faceTemplate: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, decoded.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ message: 'Admin not found' }, { status: 404 });
    }

    // Log the activity (wrap in try-catch to prevent failures)
    try {
      await logActivity({
        adminId: decoded.id,
        adminName: decoded.name,
        action: 'updated',
        entityType: 'admin',
        entityId: decoded.id,
        entityName: 'Face ID Reset',
        details: { action: 'Face ID enrollment reset' },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log activity:', logError);
    }

    return NextResponse.json({
      message: 'Face ID reset successfully',
      success: true,
    });
  } catch (error: any) {
    console.error('Reset face ID error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset face ID',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




