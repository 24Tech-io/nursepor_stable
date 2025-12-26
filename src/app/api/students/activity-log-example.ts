/**
 * Example implementations for logging student activities
 *
 * Import and use these in your student app routes/components
 */

import { logStudentActivity } from '@/lib/student-activity-log';

// Example: Log login
export async function logLogin(studentId: number, ipAddress?: string, userAgent?: string) {
  await logStudentActivity({
    studentId,
    activityType: 'login',
    title: 'User logged in',
    description: 'Student successfully logged into the system',
    ipAddress,
    userAgent,
  });
}

// Example: Log logout
export async function logLogout(studentId: number, ipAddress?: string, userAgent?: string) {
  await logStudentActivity({
    studentId,
    activityType: 'logout',
    title: 'User logged out',
    description: 'Student logged out of the system',
    ipAddress,
    userAgent,
  });
}

// Example: Log course view
export async function logCourseView(
  studentId: number,
  courseId: number,
  courseTitle: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logStudentActivity({
    studentId,
    activityType: 'course_view',
    title: `Viewed course: ${courseTitle}`,
    description: `Student accessed course "${courseTitle}"`,
    metadata: {
      courseId,
      courseTitle,
    },
    ipAddress,
    userAgent,
  });
}

// Example: Log module access
export async function logModuleAccess(
  studentId: number,
  courseId: number,
  courseTitle: string,
  moduleId: number,
  moduleTitle: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logStudentActivity({
    studentId,
    activityType: 'module_access',
    title: `Accessed module: ${moduleTitle}`,
    description: `Student accessed module "${moduleTitle}" in course "${courseTitle}"`,
    metadata: {
      courseId,
      courseTitle,
      moduleId,
      moduleTitle,
    },
    ipAddress,
    userAgent,
  });
}

// Example: Log test attempt
export async function logTestAttempt(
  studentId: number,
  quizId: number,
  quizTitle: string,
  courseId?: number,
  courseTitle?: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logStudentActivity({
    studentId,
    activityType: 'test_attempt',
    title: `Started test: ${quizTitle}`,
    description: `Student started attempting quiz "${quizTitle}"`,
    metadata: {
      quizId,
      quizTitle,
      courseId,
      courseTitle,
    },
    ipAddress,
    userAgent,
  });
}

// Example: Log test result
export async function logTestResult(
  studentId: number,
  quizId: number,
  quizTitle: string,
  score: number,
  totalQuestions: number,
  passed: boolean,
  timeSpent: number,
  courseId?: number,
  courseTitle?: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logStudentActivity({
    studentId,
    activityType: 'test_result',
    title: `Completed test: ${quizTitle}`,
    description: `Student completed quiz "${quizTitle}" with score ${score}%`,
    metadata: {
      quizId,
      quizTitle,
      score,
      totalQuestions,
      passed,
      timeSpent,
      courseId,
      courseTitle,
    },
    ipAddress,
    userAgent,
  });
}

// Example: Log video watch
export async function logVideoWatch(
  studentId: number,
  chapterId: number,
  chapterTitle: string,
  courseId?: number,
  courseTitle?: string,
  moduleId?: number,
  moduleTitle?: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logStudentActivity({
    studentId,
    activityType: 'video_watch',
    title: `Watched video: ${chapterTitle}`,
    description: `Student watched video "${chapterTitle}"`,
    metadata: {
      chapterId,
      chapterTitle,
      courseId,
      courseTitle,
      moduleId,
      moduleTitle,
    },
    ipAddress,
    userAgent,
  });
}

