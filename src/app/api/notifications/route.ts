import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications, accessRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Send notification when access request is approved/denied
export async function sendRequestStatusNotification(
    studentId: number,
    courseTitle: string,
    status: 'approved' | 'rejected'
) {
    try {
        const message = status === 'approved'
            ? `Your request for "${courseTitle}" has been approved! You can now access the course.`
            : `Your request for "${courseTitle}" has been denied. Please contact an administrator for more information.`;

        await db.insert(notifications).values({
            userId: studentId,
            title: `Course Access ${status === 'approved' ? 'Approved' : 'Denied'}`,
            message,
            type: status === 'approved' ? 'info' : 'warning',
            isRead: false
        });

        return true;
    } catch (error) {
        console.error('Failed to send notification:', error);
        return false;
    }
}

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

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
            .orderBy(notifications.createdAt);

        return NextResponse.json({ notifications: userNotifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

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
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
