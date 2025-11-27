/**
 * Progress Operations
 * Handles all progress-related database operations with dual-table sync
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, chapters, modules } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ProgressUpdateParams } from '../types';
import { EventType, ProgressEvent } from '../events/event-types';
import { dataManager } from '../core';

export class ProgressOperations {
  /**
   * Update progress for a student in a course
   * Syncs to both studentProgress and enrollments tables
   */
  static async updateProgress(
    tx: any,
    params: ProgressUpdateParams
  ): Promise<{ progress: number; previousProgress: number }> {
    const { userId, courseId, progress, source, metadata } = params;

    // Clamp progress to 0-100
    const clampedProgress = Math.min(100, Math.max(0, progress));

    // Get current progress
    const currentProgress = await tx
      .select({
        totalProgress: studentProgress.totalProgress,
        id: studentProgress.id,
      })
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (currentProgress.length === 0) {
      throw new Error(`No enrollment found for user ${userId} in course ${courseId}`);
    }

    const previousProgress = currentProgress[0].totalProgress || 0;

    // Update studentProgress
    await tx
      .update(studentProgress)
      .set({
        totalProgress: clampedProgress,
        lastAccessed: new Date(),
      })
      .where(eq(studentProgress.id, currentProgress[0].id));

    // Sync to enrollments table
    const enrollment = await tx
      .select({ id: enrollments.id, progress: enrollments.progress })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (enrollment.length > 0) {
      await tx
        .update(enrollments)
        .set({
          progress: clampedProgress,
          updatedAt: new Date(),
          completedAt: clampedProgress === 100 ? new Date() : null,
        })
        .where(eq(enrollments.id, enrollment[0].id));
    } else {
      // Create enrollment if it doesn't exist
      await tx.insert(enrollments).values({
        userId,
        courseId,
        status: 'active',
        progress: clampedProgress,
        enrolledAt: new Date(),
        completedAt: clampedProgress === 100 ? new Date() : null,
      });
    }

    // Emit event
    const event: ProgressEvent = {
      type: EventType.PROGRESS_UPDATED,
      timestamp: new Date(),
      userId,
      studentId: userId,
      courseId,
      progress: clampedProgress,
      previousProgress,
      metadata: {
        source,
        ...metadata,
      },
    };
    dataManager.emitEvent(event);

    return {
      progress: clampedProgress,
      previousProgress,
    };
  }

  /**
   * Mark chapter as complete and update progress
   */
  static async markChapterComplete(
    tx: any,
    userId: number,
    courseId: number,
    chapterId: number
  ): Promise<{ progress: number; completedChapters: number[] }> {
    // Get current progress
    const progressRecord = await tx
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (progressRecord.length === 0) {
      throw new Error(`No enrollment found for user ${userId} in course ${courseId}`);
    }

    const progress = progressRecord[0];
    let completedChapters: number[] = [];
    try {
      completedChapters = JSON.parse(progress.completedChapters || '[]');
    } catch (e) {
      completedChapters = [];
    }

    // Add chapter if not already completed
    if (!completedChapters.includes(chapterId)) {
      completedChapters.push(chapterId);
    }

    // Get total chapters in course
    const totalChaptersResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(chapters)
      .innerJoin(modules, eq(chapters.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));

    const totalChapters = Number(totalChaptersResult[0]?.count || 0);
    const newProgress = totalChapters > 0
      ? Math.round((completedChapters.length / totalChapters) * 100)
      : 0;

    // Update studentProgress
    await tx
      .update(studentProgress)
      .set({
        completedChapters: JSON.stringify(completedChapters),
        totalProgress: newProgress,
        lastAccessed: new Date(),
      })
      .where(eq(studentProgress.id, progress.id));

    // Sync to enrollments
    const enrollment = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (enrollment.length > 0) {
      await tx
        .update(enrollments)
        .set({
          progress: newProgress,
          updatedAt: new Date(),
          completedAt: newProgress === 100 ? new Date() : null,
        })
        .where(eq(enrollments.id, enrollment[0].id));
    }

    // Emit event
    const event: ProgressEvent = {
      type: EventType.CHAPTER_COMPLETED,
      timestamp: new Date(),
      userId,
      studentId: userId,
      courseId,
      progress: newProgress,
      previousProgress: progress.totalProgress || 0,
      metadata: {
        chapterId,
        completedChapters: completedChapters.length,
        totalChapters,
      },
    };
    dataManager.emitEvent(event);

    return {
      progress: newProgress,
      completedChapters,
    };
  }

  /**
   * Update video progress
   */
  static async updateVideoProgress(
    tx: any,
    userId: number,
    courseId: number,
    chapterId: number,
    videoProgress: number
  ): Promise<void> {
    // Get current progress
    const progressRecord = await tx
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (progressRecord.length === 0) {
      throw new Error(`No enrollment found for user ${userId} in course ${courseId}`);
    }

    const progress = progressRecord[0];
    let watchedVideos: any[] = [];
    try {
      watchedVideos = JSON.parse(progress.watchedVideos || '[]');
    } catch (e) {
      watchedVideos = [];
    }

    // Update or add video progress
    const videoIndex = watchedVideos.findIndex((v: any) => v.chapterId === chapterId);
    if (videoIndex >= 0) {
      watchedVideos[videoIndex] = {
        chapterId,
        progress: videoProgress,
        lastWatched: new Date(),
      };
    } else {
      watchedVideos.push({
        chapterId,
        progress: videoProgress,
        lastWatched: new Date(),
      });
    }

    // Update studentProgress
    await tx
      .update(studentProgress)
      .set({
        watchedVideos: JSON.stringify(watchedVideos),
        lastAccessed: new Date(),
      })
      .where(eq(studentProgress.id, progress.id));

    // If video is 90%+ complete, mark chapter as complete
    if (videoProgress >= 90) {
      await this.markChapterComplete(tx, userId, courseId, chapterId);
    }
  }

  /**
   * Submit quiz and update progress
   */
  static async submitQuiz(
    tx: any,
    userId: number,
    courseId: number,
    chapterId: number,
    quizId: number,
    score: number,
    passed: boolean
  ): Promise<{ progress: number; quizAttempts: any[] }> {
    // Get current progress
    const progressRecord = await tx
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(studentProgress.courseId, courseId)
        )
      )
      .limit(1);

    if (progressRecord.length === 0) {
      throw new Error(`No enrollment found for user ${userId} in course ${courseId}`);
    }

    const progress = progressRecord[0];
    let quizAttempts: any[] = [];
    try {
      quizAttempts = JSON.parse(progress.quizAttempts || '[]');
    } catch (e) {
      quizAttempts = [];
    }

    // Add quiz attempt
    quizAttempts.push({
      quizId,
      chapterId,
      score,
      passed,
      attemptedAt: new Date(),
    });

    // Get total chapters for progress calculation
    const totalChaptersResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(chapters)
      .innerJoin(modules, eq(chapters.moduleId, modules.id))
      .where(eq(modules.courseId, courseId));

    const totalChapters = Number(totalChaptersResult[0]?.count || 0);
    
    // Calculate progress based on completed chapters
    let completedChapters: number[] = [];
    try {
      completedChapters = JSON.parse(progress.completedChapters || '[]');
    } catch (e) {
      completedChapters = [];
    }

    // If quiz passed and chapter not completed, mark chapter as complete
    if (passed && !completedChapters.includes(chapterId)) {
      completedChapters.push(chapterId);
    }

    const newProgress = totalChapters > 0
      ? Math.round((completedChapters.length / totalChapters) * 100)
      : 0;

    // Update studentProgress
    await tx
      .update(studentProgress)
      .set({
        quizAttempts: JSON.stringify(quizAttempts),
        completedChapters: JSON.stringify(completedChapters),
        totalProgress: newProgress,
        lastAccessed: new Date(),
      })
      .where(eq(studentProgress.id, progress.id));

    // Sync to enrollments
    const enrollment = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (enrollment.length > 0) {
      await tx
        .update(enrollments)
        .set({
          progress: newProgress,
          updatedAt: new Date(),
          completedAt: newProgress === 100 ? new Date() : null,
        })
        .where(eq(enrollments.id, enrollment[0].id));
    }

    // Emit event
    const event: ProgressEvent = {
      type: EventType.QUIZ_SUBMITTED,
      timestamp: new Date(),
      userId,
      studentId: userId,
      courseId,
      progress: newProgress,
      previousProgress: progress.totalProgress || 0,
      metadata: {
        quizId,
        chapterId,
        score,
        passed,
      },
    };
    dataManager.emitEvent(event);

    return {
      progress: newProgress,
      quizAttempts,
    };
  }
}

