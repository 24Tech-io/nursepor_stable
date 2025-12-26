import { getDatabase } from './db';
import { notifications, courses, users, accessRequests, studentProgress } from './db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Advanced Sync Service for Admin App
 * Ensures real-time synchronization between admin and student applications
 */

/**
 * Create notification for all students when a new course is published
 */
export async function notifyNewCoursePublished(courseId: number, courseTitle: string) {
  try {
    const db = getDatabase();

    // Get all active students
    const students = await db.select().from(users).where(eq(users.role, 'student'));

    // Create notifications for all students
    const notificationValues = students.map((student) => ({
      userId: student.id,
      title: 'New Course Available',
      message: `A new course "${courseTitle}" is now available for enrollment!`,
      type: 'info',
      isRead: false,
    }));

    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
      console.log(
        `✅ Created ${notificationValues.length} notifications for new course: ${courseTitle}`
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to notify students about new course:', error);
    return false;
  }
}

/**
 * Notify student when their access request is approved
 */
export async function notifyAccessApproved(studentId: number, courseTitle: string) {
  try {
    const db = getDatabase();

    await db.insert(notifications).values({
      userId: studentId,
      title: 'Course Access Approved',
      message: `Your request for "${courseTitle}" has been approved! You can now access the course.`,
      type: 'success',
      isRead: false,
    });

    console.log(
      `✅ Notification created for student ${studentId}: Access approved for ${courseTitle}`
    );
    return true;
  } catch (error) {
    console.error('Failed to notify student about access approval:', error);
    return false;
  }
}

/**
 * Notify student when their access request is denied
 */
export async function notifyAccessDenied(studentId: number, courseTitle: string) {
  try {
    const db = getDatabase();

    await db.insert(notifications).values({
      userId: studentId,
      title: 'Course Access Denied',
      message: `Your request for "${courseTitle}" has been denied. Please contact an administrator for more information.`,
      type: 'warning',
      isRead: false,
    });

    console.log(
      `✅ Notification created for student ${studentId}: Access denied for ${courseTitle}`
    );
    return true;
  } catch (error) {
    console.error('Failed to notify student about access denial:', error);
    return false;
  }
}




