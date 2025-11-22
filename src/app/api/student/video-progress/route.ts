import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        const { chapterId, currentTime, duration, completed } = await request.json();

        if (!chapterId || currentTime === undefined || !duration) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const watchedPercentage = (currentTime / duration) * 100;
        const isCompleted = completed || watchedPercentage >= 90; // Auto-complete at 90%

        // Check if progress entry exists
        const existing = await db
            .select()
            .from(videoProgress)
            .where(
                and(
                    eq(videoProgress.userId, decoded.id),
                    eq(videoProgress.chapterId, parseInt(chapterId))
                )
            )
            .limit(1);

        if (existing.length > 0) {
            // Update existing progress
            await db
                .update(videoProgress)
                .set({
                    currentTime,
                    watchedPercentage,
                    completed: isCompleted,
                    lastWatchedAt: new Date()
                })
                .where(
                    and(
                        eq(videoProgress.userId, decoded.id),
                        eq(videoProgress.chapterId, parseInt(chapterId))
                    )
                );
        } else {
            // Create new progress entry
            await db.insert(videoProgress).values({
                userId: decoded.id,
                chapterId: parseInt(chapterId),
                currentTime,
                duration,
                watchedPercentage,
                completed: isCompleted,
            });
        }

        return NextResponse.json({
            message: 'Video progress saved',
            completed: isCompleted
        });
    } catch (error) {
        console.error('Save video progress error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
