import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, decoded.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Limit to 50 most recent

    return NextResponse.json({ notifications: userNotifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ message: 'Notification ID required' }, { status: 400 });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(notificationId)));

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
