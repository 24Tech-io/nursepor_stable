import { getDatabase } from './db';
import { studentActivityLogs } from './db/schema';

export interface StudentActivityData {
  studentId: number;
  activityType:
    | 'login'
    | 'logout'
    | 'course_view'
    | 'module_access'
    | 'chapter_access'
    | 'test_attempt'
    | 'test_result'
    | 'video_watch'
    | 'document_view'
    | 'enrollment_request'
    | 'profile_update';
  title: string;
  description?: string;
  metadata?: {
    courseId?: number;
    courseTitle?: string;
    moduleId?: number;
    moduleTitle?: string;
    chapterId?: number;
    chapterTitle?: string;
    quizId?: number;
    quizTitle?: string;
    score?: number;
    totalQuestions?: number;
    passed?: boolean;
    timeSpent?: number;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

export async function logStudentActivity(data: StudentActivityData) {
  try {
    const db = getDatabase();

    await db.insert(studentActivityLogs).values({
      studentId: data.studentId,
      activityType: data.activityType,
      title: data.title,
      description: data.description || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log student activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
}
