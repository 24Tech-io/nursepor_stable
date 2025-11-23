import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { studentProgress, chapters, modules } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const token = request.cookies.get('token')?.value;
        
        if (!token) {
            return NextResponse.json(
                { message: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        let user;
        try {
            user = verifyToken(token);
            if (!user || !user.id) {
                return NextResponse.json(
                    { message: 'Unauthorized - Invalid token' },
                    { status: 401 }
                );
            }
        } catch (error: any) {
            console.error('Token verification error:', error);
            return NextResponse.json(
                { message: 'Unauthorized - Token verification failed', error: error.message },
                { status: 401 }
            );
        }

        const userId = user.id;
        const { chapterId, courseId } = await request.json();

        if (!chapterId || !courseId) {
            return NextResponse.json(
                { message: 'Chapter ID and Course ID are required' },
                { status: 400 }
            );
        }

        let db;
        try {
            db = getDatabase();
        } catch (dbError: any) {
            console.error('❌ Database connection error:', dbError);
            return NextResponse.json(
                { 
                    message: 'Database connection error',
                    error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                },
                { status: 500 }
            );
        }

        // Verify chapter exists
        let chapter;
        try {
            chapter = await db
                .select()
                .from(chapters)
                .where(eq(chapters.id, Number(chapterId)))
                .limit(1);
        } catch (error: any) {
            console.error('❌ Error fetching chapter:', error);
            return NextResponse.json(
                { 
                    message: 'Error fetching chapter',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }

        if (!chapter.length) {
            return NextResponse.json(
                { message: 'Chapter not found' },
                { status: 404 }
            );
        }

        // Get or create student progress
        let existingProgress;
        try {
            existingProgress = await db
                .select()
                .from(studentProgress)
                .where(
                    and(
                        eq(studentProgress.studentId, userId),
                        eq(studentProgress.courseId, Number(courseId))
                    )
                )
                .limit(1);
        } catch (error: any) {
            console.error('❌ Error fetching student progress:', error);
            return NextResponse.json(
                { 
                    message: 'Error fetching student progress',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }

        if (existingProgress.length) {
            // Update existing progress
            const progress = existingProgress[0];
            let completedChapters: number[] = [];
            let watchedVideos: number[] = [];
            
            try {
                completedChapters = JSON.parse(progress.completedChapters || '[]');
            } catch (e) {
                console.warn('Failed to parse completedChapters, starting fresh');
                completedChapters = [];
            }

            try {
                watchedVideos = JSON.parse(progress.watchedVideos || '[]');
            } catch (e) {
                console.warn('Failed to parse watchedVideos, starting fresh');
                watchedVideos = [];
            }

            // Ensure chapterId is a number
            const chapterIdNum = Number(chapterId);
            const chapterData = chapter[0];
            
            // Track video if chapter is a video type
            if (chapterData.type === 'video' && !watchedVideos.includes(chapterIdNum)) {
                watchedVideos.push(chapterIdNum);
            }
            
            if (!completedChapters.includes(chapterIdNum)) {
                completedChapters.push(chapterIdNum);

                // Calculate total progress: Get total chapters in course and calculate percentage
                const totalChaptersResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(chapters)
                    .innerJoin(modules, eq(chapters.moduleId, modules.id))
                    .where(eq(modules.courseId, Number(courseId)));

                const totalChapters = Number(totalChaptersResult[0]?.count || 0);
                const totalProgress = totalChapters > 0 
                    ? Math.round((completedChapters.length / totalChapters) * 100)
                    : 0;

                try {
                    await db
                        .update(studentProgress)
                        .set({
                            completedChapters: JSON.stringify(completedChapters),
                            watchedVideos: JSON.stringify(watchedVideos),
                            totalProgress: totalProgress,
                            lastAccessed: new Date(),
                        })
                        .where(eq(studentProgress.id, progress.id));
                    
                    console.log(`✅ Chapter ${chapterIdNum} marked as complete for student ${userId}. Progress: ${totalProgress}% (${completedChapters.length}/${totalChapters} chapters)`);
                } catch (error: any) {
                    console.error('❌ Error updating progress:', error);
                    return NextResponse.json(
                        { 
                            message: 'Error updating progress',
                            error: process.env.NODE_ENV === 'development' ? error.message : undefined
                        },
                        { status: 500 }
                    );
                }
            } else {
                console.log(`ℹ️ Chapter ${chapterIdNum} already marked as complete`);
            }
        } else {
            // Create new progress entry
            const chapterIdNum = Number(chapterId);
            const chapterData = chapter[0];
            
            // Track video if chapter is a video type
            const watchedVideos = chapterData.type === 'video' ? [chapterIdNum] : [];

            // Calculate total progress: Get total chapters in course and calculate percentage
            const totalChaptersResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(chapters)
                .innerJoin(modules, eq(chapters.moduleId, modules.id))
                .where(eq(modules.courseId, Number(courseId)));

            const totalChapters = Number(totalChaptersResult[0]?.count || 0);
            const totalProgress = totalChapters > 0 
                ? Math.round((1 / totalChapters) * 100)
                : 0;

            try {
                await db.insert(studentProgress).values({
                    studentId: userId,
                    courseId: Number(courseId),
                    completedChapters: JSON.stringify([chapterIdNum]),
                    watchedVideos: JSON.stringify(watchedVideos),
                    quizAttempts: '[]',
                    totalProgress: totalProgress,
                });
                
                console.log(`✅ Created new progress entry with chapter ${chapterIdNum} for student ${userId}. Progress: ${totalProgress}% (1/${totalChapters} chapters)`);
            } catch (error: any) {
                console.error('❌ Error creating progress entry:', error);
                return NextResponse.json(
                    { 
                        message: 'Error creating progress entry',
                        error: process.env.NODE_ENV === 'development' ? error.message : undefined
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            message: 'Chapter marked as complete',
            chapterId: Number(chapterId),
            success: true,
        });
    } catch (error: any) {
        console.error('Mark chapter complete error:', error);
        return NextResponse.json(
            { message: 'Failed to mark chapter complete', error: error.message },
            { status: 500 }
        );
    }
}
