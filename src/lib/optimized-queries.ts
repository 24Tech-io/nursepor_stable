/**
 * Optimized Query Utilities
 * Reusable optimized database queries for common patterns
 * These queries use indexes, JOINs, and select only needed columns
 */

import { getDatabaseWithRetry } from './db';
import { courses, enrollments, studentProgress, accessRequests, users, payments } from './db/schema';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { trackQuery } from './performance-monitor';

/**
 * Get published courses with optimized query (uses covering index)
 */
export async function getPublishedCourses(limit?: number) {
  return trackQuery('Get published courses', async () => {
    const db = await getDatabaseWithRetry();
    let query = db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        instructor: courses.instructor,
        thumbnail: courses.thumbnail,
        pricing: courses.pricing,
        status: courses.status,
        isRequestable: courses.isRequestable,
        isDefaultUnlocked: courses.isDefaultUnlocked,
        isPublic: courses.isPublic,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
      })
      .from(courses)
      .where(sql`LOWER(${courses.status}) IN ('published', 'active')`)
      .orderBy(desc(courses.createdAt));
    
    if (limit) {
      query = query.limit(limit) as any;
    }
    
    return query;
  });
}

/**
 * Get user enrollments from both tables in a single optimized query
 */
export async function getUserEnrollments(userId: number) {
  return trackQuery('Get user enrollments', async () => {
    const db = await getDatabaseWithRetry();
    
    // Use UNION to combine both enrollment sources
    const enrollmentsQuery = db
      .select({
        courseId: enrollments.courseId,
        source: sql<string>`'enrollments'`.as('source'),
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          sql`LOWER(${enrollments.status}) = 'active'`
        )
      );
    
    const progressQuery = db
      .select({
        courseId: studentProgress.courseId,
        source: sql<string>`'progress'`.as('source'),
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, userId));
    
    // Execute both in parallel and merge
    const [enrollmentsData, progressData] = await Promise.all([
      enrollmentsQuery,
      progressQuery,
    ]);
    
    // Merge and deduplicate
    const courseIds = new Set([
      ...enrollmentsData.map(e => e.courseId),
      ...progressData.map(p => p.courseId),
    ]);
    
    return Array.from(courseIds);
  });
}

/**
 * Get user access requests (pending and approved) in a single query
 */
export async function getUserAccessRequests(userId: number) {
  return trackQuery('Get user access requests', async () => {
    const db = await getDatabaseWithRetry();
    
    return await db
      .select({
        courseId: accessRequests.courseId,
        status: accessRequests.status,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, userId),
          sql`${accessRequests.status} IN ('pending', 'approved')`
        )
      );
  });
}

/**
 * Get user by email and role (uses composite index)
 */
export async function getUserByEmailAndRole(email: string, role: string) {
  return trackQuery('Get user by email and role', async () => {
    const db = await getDatabaseWithRetry();
    
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
        isActive: users.isActive,
        twoFactorEnabled: users.twoFactorEnabled,
        phone: users.phone,
        bio: users.bio,
        profilePicture: users.profilePicture,
        joinedDate: users.joinedDate,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase()),
          eq(users.role, role)
        )
      )
      .limit(1);
  });
}

/**
 * Get course enrollment status for a user (optimized with single query)
 */
export async function getCourseEnrollmentStatus(userId: number, courseIds: number[]) {
  if (courseIds.length === 0) {
    return { enrolled: [], pending: [], approved: [] };
  }
  
  return trackQuery('Get course enrollment status', async () => {
    const db = await getDatabaseWithRetry();
    
    const [enrollmentsData, progressData, requestsData] = await Promise.all([
      // Enrollments
      db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            sql`LOWER(${enrollments.status}) = 'active'`,
            inArray(enrollments.courseId, courseIds)
          )
        ),
      // Student Progress
      db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, userId),
            inArray(studentProgress.courseId, courseIds)
          )
        ),
      // Access Requests
      db
        .select({
          courseId: accessRequests.courseId,
          status: accessRequests.status,
        })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, userId),
            inArray(accessRequests.courseId, courseIds),
            sql`${accessRequests.status} IN ('pending', 'approved')`
          )
        ),
    ]);
    
    const enrolled = new Set([
      ...enrollmentsData.map(e => e.courseId),
      ...progressData.map(p => p.courseId),
    ]);
    
    const pending = new Set(
      requestsData
        .filter(r => r.status === 'pending')
        .map(r => r.courseId)
    );
    
    const approved = new Set(
      requestsData
        .filter(r => r.status === 'approved')
        .map(r => r.courseId)
    );
    
    return {
      enrolled: Array.from(enrolled),
      pending: Array.from(pending),
      approved: Array.from(approved),
    };
  });
}

/**
 * Get user payments for courses (optimized)
 */
export async function getUserCoursePayments(userId: number) {
  return trackQuery('Get user course payments', async () => {
    const db = await getDatabaseWithRetry();
    
    return await db
      .select({ courseId: payments.courseId })
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.status, 'completed'),
          sql`${payments.courseId} IS NOT NULL`
        )
      );
  });
}

/**
 * Count records efficiently (uses COUNT instead of fetching all)
 */
export async function countRecords(
  table: any,
  whereCondition?: any
): Promise<number> {
  return trackQuery(`Count ${table._.name}`, async () => {
    const db = await getDatabaseWithRetry();
    
    let query = db
      .select({ count: sql<number>`count(*)::int` })
      .from(table);
    
    if (whereCondition) {
      query = query.where(whereCondition) as any;
    }
    
    const [result] = await query;
    return result?.count || 0;
  });
}

