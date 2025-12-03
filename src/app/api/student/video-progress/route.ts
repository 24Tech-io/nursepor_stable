import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoProgress, chapters, modules, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncProgressToEnrollments } from '@/lib/enrollment-sync';

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

    // Get chapter to find courseId
    const chapterResult = await db
      .select({
        id: chapters.id,
        moduleId: chapters.moduleId,
      })
      .from(chapters)
      .where(eq(chapters.id, parseInt(chapterId)))
      .limit(1);

    if (chapterResult.length === 0) {
      return NextResponse.json({ message: 'Chapter not found' }, { status: 404 });
    }

    // Get module to find courseId
    const moduleResult = await db
      .select({
        courseId: modules.courseId,
      })
      .from(modules)
      .where(eq(modules.id, chapterResult[0].moduleId))
      .limit(1);

    if (moduleResult.length === 0) {
      return NextResponse.json({ message: 'Module not found' }, { status: 404 });
    }

    const courseId = moduleResult[0].courseId;

    // Check if progress entry exists
    const existing = await db
      .select()
      .from(videoProgress)
      .where(
        and(eq(videoProgress.userId, decoded.id), eq(videoProgress.chapterId, parseInt(chapterId)))
      )
      .limit(1);

    const wasCompletedBefore = existing.length > 0 ? existing[0].completed : false;
    const isNewlyCompleted = isCompleted && !wasCompletedBefore;

    if (existing.length > 0) {
      // Update existing progress
      await db
        .update(videoProgress)
        .set({
          currentTime,
          watchedPercentage,
          completed: isCompleted,
          lastWatchedAt: new Date(),
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

    // If video was just completed, sync to studentProgress
    if (isNewlyCompleted) {
      try {
        // Get or create studentProgress
        const existingProgress = await db
          .select()
          .from(studentProgress)
          .where(
            and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseId))
          )
          .limit(1);

        if (existingProgress.length > 0) {
          // Update existing progress
          const progress = existingProgress[0];
          let watchedVideos: number[] = [];
          try {
            watchedVideos = JSON.parse(progress.watchedVideos || '[]');
          } catch (e) {
            watchedVideos = [];
          }

          // Add chapterId if not already in list
          if (!watchedVideos.includes(parseInt(chapterId))) {
            watchedVideos.push(parseInt(chapterId));

            // Recalculate total progress based on completed chapters and watched videos
            // Get all chapters in course
            const allChapters = await db
              .select({ id: chapters.id })
              .from(chapters)
              .innerJoin(modules, eq(chapters.moduleId, modules.id))
              .where(eq(modules.courseId, courseId));

            const totalChapters = allChapters.length;
            let completedChapters: number[] = [];
            try {
              completedChapters = JSON.parse(progress.completedChapters || '[]');
            } catch (e) {
              completedChapters = [];
            }

            const totalProgress =
              totalChapters > 0 ? Math.round((completedChapters.length / totalChapters) * 100) : 0;

            await db
              .update(studentProgress)
              .set({
                watchedVideos: JSON.stringify(watchedVideos),
                totalProgress: totalProgress,
                lastAccessed: new Date(),
              })
              .where(eq(studentProgress.id, progress.id));

            // Sync to enrollments
            await syncProgressToEnrollments(decoded.id, courseId, totalProgress);

            console.log(
              `✅ Video progress synced: Added chapter ${chapterId} to watched videos for course ${courseId}`
            );
          }
        } else {
          // Create new studentProgress entry
          const allChapters = await db
            .select({ id: chapters.id })
            .from(chapters)
            .innerJoin(modules, eq(chapters.moduleId, modules.id))
            .where(eq(modules.courseId, courseId));

          const totalChapters = allChapters.length;
          const totalProgress = totalChapters > 0 ? Math.round((1 / totalChapters) * 100) : 0;

          await db.insert(studentProgress).values({
            studentId: decoded.id,
            courseId: courseId,
            completedChapters: '[]',
            watchedVideos: JSON.stringify([parseInt(chapterId)]),
            quizAttempts: '[]',
            totalProgress: totalProgress,
          });

          // Sync to enrollments
          await syncProgressToEnrollments(decoded.id, courseId, totalProgress);

          console.log(
            `✅ Created studentProgress and synced video progress for course ${courseId}`
          );
        }
      } catch (error) {
        console.error('❌ Error syncing video progress to studentProgress:', error);
        // Don't fail the request - video progress is saved, sync can be fixed later
      }
    }

    return NextResponse.json({
      message: 'Video progress saved',
      completed: isCompleted,
    });
  } catch (error) {
    console.error('Save video progress error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
