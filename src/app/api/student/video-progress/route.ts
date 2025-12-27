import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { videoProgress, chapters, modules, studentProgress, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncProgressToEnrollments } from '@/lib/enrollment-sync';
import { extractAndValidate } from '@/lib/api-validation';
import { videoProgressSchema } from '@/lib/validation-schemas-extended';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, videoProgressSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { chapterId, currentTime, duration, completed } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    const watchedPercentage = (currentTime / duration) * 100;
    const isCompleted = completed || watchedPercentage >= 90; // Auto-complete at 90%

    // Get chapter to find courseId
    const chapterResult = await db
      .select({
        id: chapters.id,
        moduleId: chapters.moduleId,
      })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
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

    // Verify enrollment
    try {
      const enrollment = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, decoded.id),
            eq(enrollments.courseId, courseId),
            eq(enrollments.status, 'active')
          )
        )
        .limit(1);

      if (!enrollment.length) {
        return NextResponse.json({ message: 'You are not enrolled in this course' }, { status: 403 });
      }
    } catch (error) {
      logger.error('Error verifying enrollment:', error);
      return NextResponse.json({ message: 'Error verifying enrollment' }, { status: 500 });
    }

    // Check if progress entry exists
    const existing = await db
      .select()
      .from(videoProgress)
      .where(
        and(
          eq(videoProgress.userId, decoded.id),
          eq(videoProgress.chapterId, chapterId)
        )
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
          lastWatchedAt: new Date()
        })
        .where(
          and(
            eq(videoProgress.userId, decoded.id),
            eq(videoProgress.chapterId, chapterId)
          )
        );
    } else {
      // Create new progress entry
      await db.insert(videoProgress).values({
        userId: decoded.id,
        chapterId: chapterId,
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
            and(
              eq(studentProgress.studentId, decoded.id),
              eq(studentProgress.courseId, courseId)
            )
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
          if (!watchedVideos.includes(chapterId)) {
            watchedVideos.push(chapterId);

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

            const totalProgress = totalChapters > 0
              ? Math.round((completedChapters.length / totalChapters) * 100)
              : 0;

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

            logger.info(`✅ Video progress synced: Added chapter ${chapterId} to watched videos for course ${courseId}`);
          }
        } else {
          // Create new studentProgress entry
          const allChapters = await db
            .select({ id: chapters.id })
            .from(chapters)
            .innerJoin(modules, eq(chapters.moduleId, modules.id))
            .where(eq(modules.courseId, courseId));

          const totalChapters = allChapters.length;
          const totalProgress = totalChapters > 0
            ? Math.round((1 / totalChapters) * 100)
            : 0;

          await db.insert(studentProgress).values({
            studentId: decoded.id,
            courseId: courseId,
            completedChapters: '[]',
            watchedVideos: JSON.stringify([chapterId]),
            quizAttempts: '[]',
            totalProgress: totalProgress,
          });

          // Sync to enrollments
          await syncProgressToEnrollments(decoded.id, courseId, totalProgress);

          logger.info(`✅ Created studentProgress and synced video progress for course ${courseId}`);
        }
      } catch (error) {
        logger.error('❌ Error syncing video progress to studentProgress:', error);
        // Don't fail the request - video progress is saved, sync can be fixed later
      }
    }

    return NextResponse.json({
      message: 'Video progress saved',
      completed: isCompleted
    });
  } catch (error) {
    logger.error('Save video progress error:', error);
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
