/**
 * Unified Data Service - Single Source of Truth
 * All enrollment, course, and progress data flows through here
 *
 * This service eliminates data fragmentation by:
 * 1. Providing a single method to get ALL student data
 * 2. Using atomic database transactions
 * 3. Built-in caching with TTL
 * 4. Consistent data merging logic
 */

import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, accessRequests, courses } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import type {
  StudentDataSnapshot,
  EnrollmentRecord,
  CourseRequest,
  CourseData,
  StudentStats,
} from '@/types/unified-data';

export class UnifiedDataService {
  private static instance: UnifiedDataService;
  private cache: Map<string, { data: StudentDataSnapshot; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): UnifiedDataService {
    if (!this.instance) {
      this.instance = new UnifiedDataService();
    }
    return this.instance;
  }

  /**
   * Get complete student data - enrollments, courses, progress, requests
   * This is the PRIMARY method that should be used everywhere
   *
   * @param userId - Student user ID
   * @param options - Optional configuration
   * @returns Complete student data snapshot
   */
  async getStudentData(
    userId: number,
    options: { bypassCache?: boolean } = {}
  ): Promise<StudentDataSnapshot> {
    const cacheKey = `student:${userId}`;

    // Check cache first (unless bypassed)
    if (!options.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`📦 [UnifiedDataService] Cache HIT for user ${userId}`);
        return cached.data;
      }
    }

    console.log(`🔍 [UnifiedDataService] Fetching fresh data for user ${userId}`);

    // Fetch from database using single transaction for consistency
    const db = getDatabase();

    const snapshot = await db.transaction(async (tx) => {
      // Get ALL data in parallel within transaction for atomicity
      const [progressRecords, enrollmentRecords, requestRecords, allCourses] = await Promise.all([
        // Get from studentProgress table (legacy)
        tx
          .select({
            id: studentProgress.id,
            studentId: studentProgress.studentId,
            courseId: studentProgress.courseId,
            totalProgress: studentProgress.totalProgress,
            lastAccessed: studentProgress.lastAccessed,
            createdAt: studentProgress.createdAt,
          })
          .from(studentProgress)
          .where(eq(studentProgress.studentId, userId)),

        // Get from enrollments table (new source of truth)
        tx
          .select({
            id: enrollments.id,
            userId: enrollments.userId,
            courseId: enrollments.courseId,
            progress: enrollments.progress,
            status: enrollments.status,
            enrolledAt: enrollments.enrolledAt,
          })
          .from(enrollments)
          .where(eq(enrollments.userId, userId)),

        // Get all requests (pending, approved, rejected)
        tx
          .select({
            id: accessRequests.id,
            studentId: accessRequests.studentId,
            courseId: accessRequests.courseId,
            reason: accessRequests.reason,
            status: accessRequests.status,
            requestedAt: accessRequests.requestedAt,
            reviewedAt: accessRequests.reviewedAt,
            reviewedBy: accessRequests.reviewedBy,
          })
          .from(accessRequests)
          .where(eq(accessRequests.studentId, userId)),

        // Get all published courses
        tx
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
          .where(
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active'),
              eq(courses.status, 'Active')
            )
          ),
      ]);

      // Merge enrollment data using consistent logic
      const mergedEnrollments = this.mergeEnrollmentData(progressRecords, enrollmentRecords);

      // Calculate stats
      const stats = this.calculateStats(mergedEnrollments, requestRecords);

      // Build complete snapshot
      const snapshot: StudentDataSnapshot = {
        userId,
        enrollments: mergedEnrollments,
        requests: requestRecords.map((r) => ({
          id: r.id,
          courseId: r.courseId,
          status: r.status as 'pending' | 'approved' | 'rejected',
          reason: r.reason || null,
          requestedAt: r.requestedAt,
          reviewedAt: r.reviewedAt || null,
          reviewedBy: r.reviewedBy || null,
        })),
        availableCourses: allCourses.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description || null,
          instructor: c.instructor,
          thumbnail: c.thumbnail || null,
          pricing: c.pricing || 0,
          status: c.status as 'draft' | 'published' | 'active',
          isRequestable: c.isRequestable ?? true,
          isDefaultUnlocked: c.isDefaultUnlocked ?? false,
          isPublic: c.isPublic ?? false,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        stats,
        timestamp: Date.now(),
      };

      return snapshot;
    });

    // Cache the result
    this.cache.set(cacheKey, { data: snapshot, timestamp: Date.now() });
    console.log(`✅ [UnifiedDataService] Data cached for user ${userId}`);

    return snapshot;
  }

  /**
   * Merge enrollment data from both tables
   * enrollments table is source of truth, studentProgress is fallback for legacy data
   */
  private mergeEnrollmentData(
    progressRecords: any[],
    enrollmentRecords: any[]
  ): EnrollmentRecord[] {
    const map = new Map<number, EnrollmentRecord>();

    // Add enrollments first (new source of truth)
    enrollmentRecords.forEach((e) => {
      map.set(e.courseId, {
        courseId: e.courseId,
        progress: e.progress || 0,
        status: e.status || 'active',
        enrolledAt: e.enrolledAt,
        lastAccessed: null,
        source: 'enrollments',
      });
    });

    // Add from studentProgress only if not already in enrollments (legacy data)
    progressRecords.forEach((p) => {
      if (!map.has(p.courseId)) {
        map.set(p.courseId, {
          courseId: p.courseId,
          progress: p.totalProgress || 0,
          status: 'active',
          enrolledAt: p.createdAt,
          lastAccessed: p.lastAccessed || null,
          source: 'studentProgress',
        });
      } else {
        // Update lastAccessed if studentProgress has more recent data
        const existing = map.get(p.courseId)!;
        if (p.lastAccessed && (!existing.lastAccessed || p.lastAccessed > existing.lastAccessed)) {
          existing.lastAccessed = p.lastAccessed;
        }
      }
    });

    return Array.from(map.values());
  }

  /**
   * Calculate student statistics
   */
  private calculateStats(enrollments: EnrollmentRecord[], requests: any[]): StudentStats {
    const completedCount = enrollments.filter((e) => e.progress >= 100).length;
    const totalHours = enrollments.reduce((sum, e) => sum + (e.progress / 100) * 10, 0); // Estimate
    const pendingCount = requests.filter((r) => r.status === 'pending').length;

    return {
      coursesEnrolled: enrollments.length,
      coursesCompleted: completedCount,
      hoursLearned: Math.round(totalHours),
      pendingRequests: pendingCount,
    };
  }

  /**
   * Invalidate cache when data changes
   * Call this after enrollment, unenrollment, or request changes
   */
  invalidateCache(userId: number): void {
    const cacheKey = `student:${userId}`;
    this.cache.delete(cacheKey);
    console.log(`🗑️ [UnifiedDataService] Cache invalidated for user ${userId}`);
  }

  /**
   * Clear all cache (for testing/debugging)
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log(`🗑️ [UnifiedDataService] All cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const unifiedDataService = UnifiedDataService.getInstance();

