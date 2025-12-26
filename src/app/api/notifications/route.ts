import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        let decoded: any = null;
        try {
          decoded = await verifyToken(token);
        } catch {
          return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        const db = await getDatabaseWithRetry();
        
        // Handle case where notifications table might not exist
        let userNotifications = [];
        try {
          userNotifications = await db
              .select()
              .from(notifications)
              .where(eq(notifications.userId, decoded.id))
              .orderBy(desc(notifications.createdAt))
              .limit(50); // Limit to 50 most recent
        } catch (error: any) {
          // Table doesn't exist - return empty array
          logger.warn('⚠️ notifications table not accessible, returning empty notifications:', error?.message);
          userNotifications = [];
        }

        return NextResponse.json({ notifications: userNotifications });
    } catch (error: any) {
        logger.error('Get notifications error:', error);
        logger.error('Error details:', error?.message, error?.stack);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
        }, { status: 500 });
    }
}

// PATCH - Mark notification as read
export async function PATCH(request: NextRequest) {
    try {
        const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        let decoded: any = null;
        try {
          decoded = await verifyToken(token);
        } catch {
          return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json({ message: 'Notification ID required' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();
        
        // Handle case where notifications table might not exist
        try {
          await db
              .update(notifications)
              .set({ isRead: true })
              .where(eq(notifications.id, parseInt(notificationId)));
        } catch (error: any) {
          // Table doesn't exist - return success anyway
          logger.warn('⚠️ notifications table not accessible:', error?.message);
        }

        return NextResponse.json({ message: 'Notification marked as read' });
    } catch (error: any) {
        logger.error('Update notification error:', error);
        logger.error('Error details:', error?.message, error?.stack);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
        }, { status: 500 });
    }
}

// POST - Mark all notifications as read for the user
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        let decoded: any = null;
        try {
          decoded = await verifyToken(token);
        } catch {
          return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        const db = await getDatabaseWithRetry();
        
        // Handle case where notifications table might not exist
        try {
          await db
              .update(notifications)
              .set({ isRead: true })
              .where(
                  and(
                      eq(notifications.userId, decoded.id),
                      eq(notifications.isRead, false)
                  )
              );
        } catch (error: any) {
          // Table doesn't exist - return success anyway
          logger.warn('⚠️ notifications table not accessible:', error?.message);
        }

        return NextResponse.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
        logger.error('Mark all notifications as read error:', error);
        logger.error('Error details:', error?.message, error?.stack);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
        }, { status: 500 });
    }
}
