/**
 * Notification Helper Functions
 * Utilities for creating and sending notifications
 */

import { getDatabase } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

/**
 * Send notification when access request is approved/denied
 */
export async function sendRequestStatusNotification(
  studentId: number,
  courseTitle: string,
  status: 'approved' | 'rejected'
): Promise<boolean> {
  try {
    const db = getDatabase();
    const message =
      status === 'approved'
        ? `Your request for "${courseTitle}" has been approved! You can now access the course.`
        : `Your request for "${courseTitle}" has been denied. Please contact an administrator for more information.`;

    await db.insert(notifications).values({
      userId: studentId,
      title: `Course Access ${status === 'approved' ? 'Approved' : 'Denied'}`,
      message,
      type: status === 'approved' ? 'info' : 'warning',
      isRead: false,
    });

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Send notification for course completion
 */
export async function sendCourseCompletionNotification(
  studentId: number,
  courseTitle: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.insert(notifications).values({
      userId: studentId,
      title: 'Course Completed!',
      message: `Congratulations! You've completed "${courseTitle}".`,
      type: 'success',
      isRead: false,
    });

    return true;
  } catch (error) {
    console.error('Failed to send completion notification:', error);
    return false;
  }
}

/**
 * Send notification for certificate generation
 */
export async function sendCertificateNotification(
  studentId: number,
  courseTitle: string,
  certificateUrl: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.insert(notifications).values({
      userId: studentId,
      title: 'Certificate Ready!',
      message: `Your certificate for "${courseTitle}" is ready to download.`,
      type: 'success',
      isRead: false,
      data: JSON.stringify({ certificateUrl }),
    });

    return true;
  } catch (error) {
    console.error('Failed to send certificate notification:', error);
    return false;
  }
}

