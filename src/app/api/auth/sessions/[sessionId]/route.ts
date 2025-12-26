import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

// DELETE - Force logout a specific session
export async function DELETE(
    request: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        const sessionId = parseInt(params.sessionId);

        if (isNaN(sessionId)) {
            return NextResponse.json({ message: 'Invalid session ID' }, { status: 400 });
        }

        // Verify the session belongs to the user (or user is admin)
        const session = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (session.length === 0) {
            return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        }

        // Only allow users to delete their own sessions, or admins to delete any
        if (session[0].userId !== decoded.id && decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        // Delete the session
        await db
            .delete(sessions)
            .where(eq(sessions.id, sessionId));

        securityLogger.info('Session force logout', {
            requestedBy: decoded.id,
            targetUserId: session[0].userId,
            sessionId,
            deviceInfo: session[0].deviceInfo
        });

        return NextResponse.json({
            message: 'Session terminated successfully'
        });
    } catch (error) {
        logger.error('Force logout error:', error);
        securityLogger.error('Force logout failed', { error: String(error) });
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}

// GET - List all active sessions for current user
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        // Get all active sessions for this user
        const userSessions = await db
            .select({
                id: sessions.id,
                deviceInfo: sessions.deviceInfo,
                createdAt: sessions.createdAt,
                expiresAt: sessions.expiresAt
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.userId, decoded.id),
                    eq(sessions.expiresAt, new Date()) // Only active sessions
                )
            );

        return NextResponse.json({
            sessions: userSessions,
            total: userSessions.length
        });
    } catch (error) {
        logger.error('Get sessions error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
