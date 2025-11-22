import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { studentProgress, chapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = authResult.user.id;
        const { chapterId, courseId } = await request.json();

        if (!chapterId || !courseId) {
            return NextResponse.json(
                { message: 'Chapter ID and Course ID are required' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Verify chapter exists
        const chapter = await db
            .select()
            .from(chapters)
            .where(eq(chapters.id, chapterId))
            .limit(1);

        if (!chapter.length) {
            return NextResponse.json(
                { message: 'Chapter not found' },
                { status: 404 }
            );
        }

        // Get or create student progress
        const existingProgress = await db
            .select()
            .from(studentProgress)
            .where(
                and(
                    eq(studentProgress.studentId, userId),
                    eq(studentProgress.courseId, courseId)
                )
            )
            .limit(1);

        if (existingProgress.length) {
            // Update existing progress
            const progress = existingProgress[0];
            const completedChapters = JSON.parse(progress.completedChapters || '[]');

            if (!completedChapters.includes(chapterId)) {
                completedChapters.push(chapterId);

                await db
                    .update(studentProgress)
                    .set({
                        completedChapters: JSON.stringify(completedChapters),
                        lastAccessed: new Date(),
                    })
                    .where(eq(studentProgress.id, progress.id));
            }
        } else {
            // Create new progress entry
            await db.insert(studentProgress).values({
                studentId: userId,
                courseId,
                completedChapters: JSON.stringify([chapterId]),
                watchedVideos: '[]',
                quizAttempts: '[]',
                totalProgress: 0,
            });
        }

        return NextResponse.json({
            message: 'Chapter marked as complete',
            chapterId,
        });
    } catch (error: any) {
        console.error('Mark chapter complete error:', error);
        return NextResponse.json(
            { message: 'Failed to mark chapter complete', error: error.message },
            { status: 500 }
        );
    }
}
