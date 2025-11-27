/**
 * Progress Validator
 * Validates progress operations before execution
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, courses, chapters, modules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationResult } from '../types';
import { ProgressUpdateParams } from '../types';

export class ProgressValidator {
  /**
   * Validate progress update parameters
   */
  static async validateProgressUpdate(params: ProgressUpdateParams): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const db = getDatabase();

      // Validate user is enrolled
      const enrollment = await db
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, params.userId),
            eq(studentProgress.courseId, params.courseId)
          )
        )
        .limit(1);

      if (enrollment.length === 0) {
        errors.push(`User ${params.userId} is not enrolled in course ${params.courseId}`);
      }

      // Validate course exists
      const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, params.courseId))
        .limit(1);

      if (course.length === 0) {
        errors.push(`Course ${params.courseId} does not exist`);
      }

      // Validate progress value
      if (params.progress < 0 || params.progress > 100) {
        errors.push(`Progress must be between 0 and 100, got ${params.progress}`);
      }

      // Validate chapter exists if chapterId is provided
      if (params.metadata?.chapterId) {
        const chapter = await db
          .select()
          .from(chapters)
          .where(eq(chapters.id, params.metadata.chapterId))
          .limit(1);

        if (chapter.length === 0) {
          errors.push(`Chapter ${params.metadata.chapterId} does not exist`);
        } else {
          // Verify chapter belongs to course
          const module = await db
            .select()
            .from(modules)
            .where(eq(modules.id, chapter[0].moduleId))
            .limit(1);

          if (module.length === 0 || module[0].courseId !== params.courseId) {
            errors.push(`Chapter ${params.metadata.chapterId} does not belong to course ${params.courseId}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }
}

