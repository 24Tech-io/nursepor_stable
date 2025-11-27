/**
 * Progress Helper
 * High-level helper functions for progress operations using DataManager
 */

import { dataManager } from '../core';
import { ProgressOperations } from '../operations/progress';
import { ProgressValidator } from '../validators/progress-validator';
import { ProgressUpdateParams, OperationResult } from '../types';

/**
 * Update progress for a student
 */
export async function updateProgress(
  params: ProgressUpdateParams
): Promise<OperationResult<{ progress: number; previousProgress: number }>> {
  return await dataManager.executeOperation({
    type: 'update_progress',
    params,
    validator: async (p) => await ProgressValidator.validateProgressUpdate(p),
    executor: async (tx, p) => await ProgressOperations.updateProgress(tx, p),
    retryable: false, // Progress updates shouldn't retry
  });
}

/**
 * Mark chapter as complete
 */
export async function markChapterComplete(
  userId: number,
  courseId: number,
  chapterId: number
): Promise<OperationResult<{ progress: number; completedChapters: number[] }>> {
  return await dataManager.executeOperation({
    type: 'mark_chapter_complete',
    params: { userId, courseId, chapterId },
    executor: async (tx) => await ProgressOperations.markChapterComplete(tx, userId, courseId, chapterId),
    retryable: false,
  });
}

/**
 * Submit quiz and update progress
 */
export async function submitQuiz(
  userId: number,
  courseId: number,
  chapterId: number,
  quizId: number,
  score: number,
  passed: boolean
): Promise<OperationResult<{ progress: number; quizAttempts: any[] }>> {
  return await dataManager.executeOperation({
    type: 'submit_quiz',
    params: { userId, courseId, chapterId, quizId, score, passed },
    executor: async (tx) => await ProgressOperations.submitQuiz(tx, userId, courseId, chapterId, quizId, score, passed),
    retryable: false,
  });
}

