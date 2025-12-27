import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { accessRequests, users, courses, studentProgress } from '@/lib/db/schema';
import { eq, desc, and, ne, or, isNotNull } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch all access requests
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    const db = await getDatabaseWithRetry();

    logger.info('🔍 [GET /api/requests] Starting request fetch...');

    // STEP 1: Clean up ALL processed requests FIRST
    // Delete: 1) All approved/rejected requests, 2) Any request with reviewedAt set (inconsistent state)
    try {
      logger.info('🧹 [GET /api/requests] Cleaning up processed requests (approved/rejected/inconsistent)...');

      // Get all requests to check their state
      const allRequestsCheck = await db
        .select({
          id: accessRequests.id,
          status: accessRequests.status,
          reviewedAt: accessRequests.reviewedAt
        })
        .from(accessRequests);

      // Delete requests with reviewedAt set OR status is approved/rejected
      // Check reviewedAt properly (it could be null, undefined, or a Date object)
      const requestsToDelete = allRequestsCheck.filter((req: any) => {
        const hasReviewedAt = req.reviewedAt !== null && req.reviewedAt !== undefined;
        const isProcessed = req.status === 'approved' || req.status === 'rejected';
        return hasReviewedAt || isProcessed;
      });

      if (requestsToDelete.length > 0) {
        logger.info(`🧹 [GET /api/requests] Found ${requestsToDelete.length} processed/inconsistent requests to delete`);
        for (const req of requestsToDelete) {
          try {
            await db.delete(accessRequests).where(eq(accessRequests.id, req.id));
            logger.info(`🗑️ [GET /api/requests] Deleted request #${req.id} (status: ${req.status}, has reviewedAt: ${req.reviewedAt !== null})`);
          } catch (err: any) {
            logger.error(`❌ [GET /api/requests] Error deleting request #${req.id}:`, err);
          }
        }
        logger.info(`✅ [GET /api/requests] Cleaned up ${requestsToDelete.length} processed/inconsistent requests`);
      } else {
        logger.info('ℹ️ [GET /api/requests] No processed requests to clean up');
      }
    } catch (cleanupError: any) {
      logger.error('❌ [GET /api/requests] Error during request cleanup:', cleanupError);
      // Continue anyway - don't fail the entire request
    }

    // STEP 2: Fetch ONLY pending requests with database-level filtering
    // Use innerJoin since foreign keys ensure user/course exists when request is created
    logger.info('📊 [GET /api/requests] Fetching pending requests from database...');

    // First, get all pending requests
    const allPendingRequests = await db
      .select({
        id: accessRequests.id,
        studentId: accessRequests.studentId,
        studentName: users.name,
        studentEmail: users.email,
        courseId: accessRequests.courseId,
        courseTitle: courses.title,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
      })
      .from(accessRequests)
      .innerJoin(users, eq(accessRequests.studentId, users.id))
      .innerJoin(courses, eq(accessRequests.courseId, courses.id))
      .where(eq(accessRequests.status, 'pending')) // Database-level filter
      .orderBy(desc(accessRequests.requestedAt));

    // STEP 2.5: Clean up requests where student is already enrolled
    // This fixes the critical issue where approved requests weren't properly deleted
    const requestsToDeleteForEnrollment: number[] = [];
    try {
      logger.info('🧹 [GET /api/requests] Checking for requests where students are already enrolled...');

      if (allPendingRequests.length > 0) {
        const enrollments = await db
          .select({
            studentId: studentProgress.studentId,
            courseId: studentProgress.courseId,
          })
          .from(studentProgress)
          .limit(10000);

        const enrollmentSet = new Set(
          enrollments.map((e: any) => `${e.studentId}-${e.courseId}`)
        );

        allPendingRequests.forEach((req: any) => {
          const key = `${req.studentId}-${req.courseId}`;
          if (enrollmentSet.has(key)) {
            logger.warn(`⚠️ [GET /api/requests] Student ${req.studentId} already enrolled in course ${req.courseId} (${req.courseTitle || 'Unknown'}) - deleting stale request #${req.id}`);
            requestsToDeleteForEnrollment.push(req.id);
          }
        });

        if (requestsToDeleteForEnrollment.length > 0) {
          for (const id of requestsToDeleteForEnrollment) {
            try {
              await db.delete(accessRequests).where(eq(accessRequests.id, id));
              logger.info(`🗑️ [GET /api/requests] Deleted stale request #${id} (student already enrolled)`);
            } catch (err: any) {
              logger.error(`❌ [GET /api/requests] Error deleting stale request #${id}:`, err);
            }
          }
          logger.info(`✅ [GET /api/requests] Cleaned up ${requestsToDeleteForEnrollment.length} stale requests`);
        }
      }
    } catch (enrollmentCleanupError: any) {
      logger.error('❌ [GET /api/requests] Error during enrollment cleanup:', enrollmentCleanupError);
    }

    // Filter out any requests with reviewedAt set (these were processed but status wasn't updated)
    // Also filter out requests that were deleted during enrollment cleanup
    const inconsistentIds: number[] = [];
    const pendingRequests = allPendingRequests.filter((req: any) => {
      // Skip requests that were deleted during enrollment cleanup
      if (requestsToDeleteForEnrollment.includes(req.id)) {
        return false;
      }

      // Check properly for null/undefined
      if (req.reviewedAt !== null && req.reviewedAt !== undefined) {
        logger.warn(`⚠️ [GET /api/requests] Found request #${req.id} with status='pending' but reviewedAt is set - will delete`);
        inconsistentIds.push(req.id);
        return false;
      }
      return true;
    });

    // Delete inconsistent requests synchronously
    if (inconsistentIds.length > 0) {
      logger.info(`🧹 [GET /api/requests] Deleting ${inconsistentIds.length} requests with reviewedAt set...`);
      for (const id of inconsistentIds) {
        try {
          await db.delete(accessRequests).where(eq(accessRequests.id, id));
          logger.info(`🗑️ [GET /api/requests] Deleted inconsistent request #${id}`);
        } catch (err: any) {
          logger.error(`❌ [GET /api/requests] Failed to delete inconsistent request #${id}:`, err);
        }
      }
    }

    // STEP 3: Final validation - filter out any remaining inconsistent requests
    // (These shouldn't exist after cleanup, but double-check)
    const inconsistentRequestIds: number[] = [];
    const validatedRequests = pendingRequests.filter((req: any) => {
      // Skip requests that were deleted during enrollment cleanup
      if (requestsToDeleteForEnrollment.includes(req.id)) {
        return false;
      }

      // CRITICAL: If reviewedAt is set, this request was already processed - don't show it
      // Check properly for null/undefined (shouldn't happen after cleanup, but double-check)
      if (req.reviewedAt !== null && req.reviewedAt !== undefined) {
        logger.warn(`⚠️ [GET /api/requests] CRITICAL: Request #${req.id} has reviewedAt but passed filter! Will delete...`);
        inconsistentRequestIds.push(req.id);
        return false; // Don't return inconsistent requests
      }

      // CRITICAL: If status is not pending, don't show it
      if (req.status !== 'pending') {
        logger.warn(`⚠️ [GET /api/requests] CRITICAL: Request #${req.id} has status '${req.status}' but passed filter! Will delete...`);
        inconsistentRequestIds.push(req.id);
        return false; // Don't return non-pending requests
      }

      // NOTE: With innerJoin, studentName and courseTitle should always be populated
      // Foreign keys ensure user/course exists when request is created
      // No need to check for null/undefined as it would indicate a data integrity issue

      return true;
    });

    // Delete any inconsistent requests that somehow passed the filter
    if (inconsistentRequestIds.length > 0) {
      logger.info(`🧹 [GET /api/requests] Deleting ${inconsistentRequestIds.length} inconsistent requests that passed filter...`);
      for (const id of inconsistentRequestIds) {
        try {
          await db.delete(accessRequests).where(eq(accessRequests.id, id));
          logger.info(`🗑️ [GET /api/requests] Deleted inconsistent request #${id}`);
        } catch (err: any) {
          logger.error(`❌ [GET /api/requests] Failed to delete inconsistent request #${id}:`, err);
        }
      }
    }

    // Format requests - with innerJoin, names/titles should always be present
    const formattedRequests = validatedRequests.map((req: any) => ({
      ...req,
      // These should always be present with innerJoin, but add fallbacks just in case
      studentName: req.studentName || `[User #${req.studentId}]`,
      studentEmail: req.studentEmail || 'N/A',
      courseTitle: req.courseTitle || `[Course #${req.courseId}]`,
      isOrphaned: false, // With innerJoin, requests are never orphaned
    }));

    logger.info(`✅ [GET /api/requests] Returning ${formattedRequests.length} pending requests`);
    logger.info(`📋 [GET /api/requests] Pending request IDs:`, formattedRequests.map((r: any) => r.id));

    return NextResponse.json({ requests: formattedRequests });
  } catch (error: any) {
    logger.error('Get requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}
