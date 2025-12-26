import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';

// GET - Fetch admin profile
export async function GET(request: NextRequest) {
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
    const [admin] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        bio: users.bio,
        profilePicture: users.profilePicture,
        role: users.role,
        isActive: users.isActive,
        faceIdEnrolled: users.faceIdEnrolled,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!admin) {
      return NextResponse.json({ message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ user: admin });
  } catch (error: any) {
    console.error('Get admin profile error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch admin profile', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update admin profile
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, bio } = body;

    const db = getDatabase();

    // Update admin profile
    const [updatedAdmin] = await db
      .update(users)
      .set({
        name: name || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, decoded.id))
      .returning();

    // Log the activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'updated',
      entityType: 'admin',
      entityId: decoded.id,
      entityName: 'Profile',
      details: {
        changes: {
          name: name !== decoded.name ? { from: decoded.name, to: name } : undefined,
        },
      },
    });

    return NextResponse.json({
      user: {
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        bio: updatedAdmin.bio,
        profilePicture: updatedAdmin.profilePicture,
        role: updatedAdmin.role,
        isActive: updatedAdmin.isActive,
        createdAt: updatedAdmin.createdAt,
        lastLogin: updatedAdmin.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('Update admin profile error:', error);
    return NextResponse.json(
      { message: 'Failed to update admin profile', error: error.message },
      { status: 500 }
    );
  }
}

