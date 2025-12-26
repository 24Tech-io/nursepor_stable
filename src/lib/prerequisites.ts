/**
 * Chapter Prerequisites Enforcement
 * Check if a student can access a chapter based on prerequisites
 */

import { getDatabase } from './db';
import { chapters, studentProgress } from './db/schema';
import { eq, and } from 'drizzle-orm';

export interface PrerequisiteCheck {
  canAccess: boolean;
  reason?: string;
  prerequisiteChapter?: {
    id: number;
    title: string;
  };
}

/**
 * Check if student can access a chapter
 * @param studentId - Student's user ID
 * @param chapterId - Chapter ID to check
 * @returns Promise with access status and reason
 */
export async function canAccessChapter(
  studentId: number,
  chapterId: number
): Promise<PrerequisiteCheck> {
  try {
    const db = getDatabase();

    // Get the chapter to check if it has prerequisites
    const chapter = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);

    if (chapter.length === 0) {
      return { canAccess: false, reason: 'Chapter not found' };
    }

    const currentChapter = chapter[0];

    // If no prerequisite, allow access
    if (!currentChapter.prerequisiteChapterId) {
      return { canAccess: true };
    }

    // Get prerequisite chapter details
    const prerequisite = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, currentChapter.prerequisiteChapterId))
      .limit(1);

    if (prerequisite.length === 0) {
      // Prerequisite doesn't exist, allow access
      return { canAccess: true };
    }

    // Check if student has completed the prerequisite
    // For now, we'll assume completion is tracked in studentProgress
    // In a full implementation, you'd have a chapterProgress table

    // TODO: Implement chapter-level progress tracking
    // For now, we'll allow access if they have enrolled in the course
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.courseId, currentChapter.moduleId) // This needs to be fixed with proper courseId lookup
        )
      );

    if (enrollment.length > 0) {
      return { canAccess: true };
    }

    return {
      canAccess: false,
      reason: 'You must complete the prerequisite chapter first',
      prerequisiteChapter: {
        id: prerequisite[0].id,
        title: prerequisite[0].title,
      },
    };
  } catch (error) {
    console.error('Error checking prerequisites:', error);
    // On error, allow access (fail open)
    return { canAccess: true };
  }
}

/**
 * Check if a student has completed a chapter
 */
export async function isChapterCompleted(studentId: number, chapterId: number): Promise<boolean> {
  // TODO: Implement chapter completion tracking
  // For now, return false
  return false;
}
