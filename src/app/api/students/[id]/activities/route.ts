
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentActivityLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.isAuthenticated || !auth.user) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }
        const decoded = auth.user;

        // Allow admins to view any student's activity
        // Allow students to view ONLY their own activity
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin' && (decoded.id && decoded.id.toString() !== params.id)) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const studentId = parseInt(params.id);
        if (isNaN(studentId)) {
            return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
        }

        // Get limit from query params
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '100');

        const db = await getDatabaseWithRetry();

        let activities = [];
        try {
            activities = await db
                .select()
                .from(studentActivityLogs)
                .where(eq(studentActivityLogs.studentId, studentId))
                .orderBy(desc(studentActivityLogs.createdAt))
                .limit(limit);
        } catch (error: any) {
            // Handle table not found gracefully
            if (error.message?.includes('does not exist') || error.code === '42P01') {
                logger.warn('student_activity_logs table not found, returning empty array');
                return NextResponse.json({ activities: [] });
            }
            throw error;
        }

        // Parse metadata if it's a string
        const formattedActivities = activities.map((activity: any) => {
            let metadata = activity.metadata;
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                } catch (e) {
                    // Keep as string or empty object
                }
            }
            return {
                ...activity,
                metadata
            };
        });

        return NextResponse.json({
            activities: formattedActivities
        });
    } catch (error: any) {
        logger.error('Get student activities error:', error);
        return NextResponse.json(
            { message: 'Failed to fetch student activities' },
            { status: 500 }
        );
    }
}
