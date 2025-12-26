import { getDatabase } from './db';
import { notifications, courses, users, accessRequests } from './db/schema';
import { studentProgress } from './db/schema-indices';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Advanced Sync Service
 * Ensures real-time synchronization between admin and student applications
 */

export interface SyncEvent {
  type: 'course_created' | 'course_updated' | 'course_published' | 'access_approved' | 'access_denied' | 'enrollment_created' | 'enrollment_removed';
  entityId: number | string;
  entityType: string;
  data: any;
  timestamp: Date;
}

/**
 * Create notification for all students when a new course is published
 */
export async function notifyNewCoursePublished(courseId: number, courseTitle: string) {
  try {
    const db = getDatabase();

    // Get all active students
    const students = await db
      .select()
      .from(users)
      .where(eq(users.role, 'student'));

    // Create notifications for all students
    const notificationValues = students.map(student => ({
      userId: student.id,
      title: 'New Course Available',
      message: `A new course "${courseTitle}" is now available for enrollment!`,
      type: 'info',
      isRead: false,
    }));

    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
      console.log(`✅ Created ${notificationValues.length} notifications for new course: ${courseTitle}`);
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

    console.log(`✅ Notification created for student ${studentId}: Access approved for ${courseTitle}`);
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

    console.log(`✅ Notification created for student ${studentId}: Access denied for ${courseTitle}`);
    return true;
  } catch (error) {
    console.error('Failed to notify student about access denial:', error);
    return false;
  }
}

/**
 * Sync check - Verify data consistency between admin and student
 */
export async function performSyncCheck() {
  try {
    const db = getDatabase();

    // Check for orphaned enrollments
    const allProgress = await db.select().from(studentProgress);
    const allCourses = await db.select().from(courses);
    const allUsers = await db.select().from(users).where(eq(users.role, 'student'));

    const courseIds = new Set(allCourses.map(c => c.id));
    const userIds = new Set(allUsers.map(u => u.id));

    const orphanedProgress = allProgress.filter(p =>
      !courseIds.has(p.courseId) || !userIds.has(p.studentId)
    );

    // Check for pending requests that should be processed
    const pendingRequests = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'));

    return {
      success: true,
      stats: {
        totalCourses: allCourses.length,
        publishedCourses: allCourses.filter(c => c.status === 'published').length,
        totalStudents: allUsers.length,
        totalEnrollments: allProgress.length,
        orphanedEnrollments: orphanedProgress.length,
        pendingRequests: pendingRequests.length,
      },
      issues: orphanedProgress.length > 0 ? [`Found ${orphanedProgress.length} orphaned enrollment(s)`] : [],
    };
  } catch (error: any) {
    console.error('Sync check failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get sync status for monitoring
 */
export async function getSyncStatus() {
  try {
    const db = getDatabase();

    const [coursesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(eq(courses.status, 'published'));

    const [studentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'student'));

    const [enrollmentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentProgress);

    const [pendingRequestsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'));

    return {
      courses: Number(coursesCount?.count || 0),
      students: Number(studentsCount?.count || 0),
      enrollments: Number(enrollmentsCount?.count || 0),
      pendingRequests: Number(pendingRequestsCount?.count || 0),
      lastSync: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Failed to get sync status:', error);
    return null;
  }
}

