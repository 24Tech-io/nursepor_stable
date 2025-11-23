import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses } from '@/lib/db/schema';
import { eq, desc, and, ne, or, isNotNull } from 'drizzle-orm';

// GET - Fetch all access requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    console.log('🔍 [GET /api/requests] Starting request fetch...');

    // STEP 1: Clean up ALL processed requests FIRST
    // Delete: 1) All approved/rejected requests, 2) Any request with reviewedAt set (inconsistent state)
    try {
      console.log('🧹 [GET /api/requests] Cleaning up processed requests (approved/rejected/inconsistent)...');
      
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
        console.log(`🧹 [GET /api/requests] Found ${requestsToDelete.length} processed/inconsistent requests to delete`);
        for (const req of requestsToDelete) {
          try {
            await db.delete(accessRequests).where(eq(accessRequests.id, req.id));
            console.log(`🗑️ [GET /api/requests] Deleted request #${req.id} (status: ${req.status}, has reviewedAt: ${req.reviewedAt !== null})`);
          } catch (err: any) {
            console.error(`❌ [GET /api/requests] Error deleting request #${req.id}:`, err);
          }
        }
        console.log(`✅ [GET /api/requests] Cleaned up ${requestsToDelete.length} processed/inconsistent requests`);
      } else {
        console.log('ℹ️ [GET /api/requests] No processed requests to clean up');
      }
    } catch (cleanupError: any) {
      console.error('❌ [GET /api/requests] Error during request cleanup:', cleanupError);
      // Continue anyway - don't fail the entire request
    }

    // STEP 2: Fetch ONLY pending requests with database-level filtering
    // This ensures we only get pending requests from the database
    // Also exclude any requests with reviewedAt set (these are processed)
    console.log('📊 [GET /api/requests] Fetching pending requests from database...');
    
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
      .leftJoin(users, eq(accessRequests.studentId, users.id))
      .leftJoin(courses, eq(accessRequests.courseId, courses.id))
      .where(eq(accessRequests.status, 'pending')) // Database-level filter
      .orderBy(desc(accessRequests.requestedAt));
    
    // Filter out any requests with reviewedAt set (these were processed but status wasn't updated)
    const inconsistentIds: number[] = [];
    const pendingRequests = allPendingRequests.filter((req: any) => {
      // Check properly for null/undefined
      if (req.reviewedAt !== null && req.reviewedAt !== undefined) {
        console.warn(`⚠️ [GET /api/requests] Found request #${req.id} with status='pending' but reviewedAt is set - will delete`);
        inconsistentIds.push(req.id);
        return false;
      }
      return true;
    });
    
    // Delete inconsistent requests synchronously
    if (inconsistentIds.length > 0) {
      console.log(`🧹 [GET /api/requests] Deleting ${inconsistentIds.length} requests with reviewedAt set...`);
      for (const id of inconsistentIds) {
        try {
          await db.delete(accessRequests).where(eq(accessRequests.id, id));
          console.log(`🗑️ [GET /api/requests] Deleted inconsistent request #${id}`);
        } catch (err: any) {
          console.error(`❌ [GET /api/requests] Failed to delete inconsistent request #${id}:`, err);
        }
      }
    }

    // STEP 3: Final validation - filter out any remaining inconsistent requests
    // (These shouldn't exist after cleanup, but double-check)
    const inconsistentRequestIds: number[] = [];
    const validatedRequests = pendingRequests.filter((req: any) => {
      // Handle orphaned requests (deleted user or course)
      if (!req.studentName && !req.studentEmail) {
        console.warn(`⚠️ [GET /api/requests] Orphaned request #${req.id} - user not found (studentId: ${req.studentId})`);
        // Still return it, but log the warning
      }
      if (!req.courseTitle) {
        console.warn(`⚠️ [GET /api/requests] Orphaned request #${req.id} - course not found (courseId: ${req.courseId})`);
        // Still return it, but log the warning
      }
      
      // CRITICAL: If reviewedAt is set, this request was already processed - don't show it
      // Check properly for null/undefined (shouldn't happen after cleanup, but double-check)
      if (req.reviewedAt !== null && req.reviewedAt !== undefined) {
        console.warn(`⚠️ [GET /api/requests] CRITICAL: Request #${req.id} has reviewedAt but passed filter! Will delete...`);
        inconsistentRequestIds.push(req.id);
        return false; // Don't return inconsistent requests
      }
      
      // CRITICAL: If status is not pending, don't show it
      if (req.status !== 'pending') {
        console.warn(`⚠️ [GET /api/requests] CRITICAL: Request #${req.id} has status '${req.status}' but passed filter! Will delete...`);
        inconsistentRequestIds.push(req.id);
        return false; // Don't return non-pending requests
      }
      
      return true;
    });
    
    // Delete any inconsistent requests that somehow passed the filter
    if (inconsistentRequestIds.length > 0) {
      console.log(`🧹 [GET /api/requests] Deleting ${inconsistentRequestIds.length} inconsistent requests that passed filter...`);
      for (const id of inconsistentRequestIds) {
        try {
          await db.delete(accessRequests).where(eq(accessRequests.id, id));
          console.log(`🗑️ [GET /api/requests] Deleted inconsistent request #${id}`);
        } catch (err: any) {
          console.error(`❌ [GET /api/requests] Failed to delete inconsistent request #${id}:`, err);
        }
      }
    }

    console.log(`✅ [GET /api/requests] Returning ${validatedRequests.length} pending requests`);
    console.log(`📋 [GET /api/requests] Pending request IDs:`, validatedRequests.map((r: any) => r.id));

    return NextResponse.json({ requests: validatedRequests });
  } catch (error: any) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}

