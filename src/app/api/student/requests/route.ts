import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { accessRequests, courses, enrollments, studentProgress } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';

// CACHE DISABLED - Force fresh data
export const revalidate = 0;

// GET - Fetch student's own access requests
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    const decoded = auth.user;

    const db = await getDatabaseWithRetry();

    // Fetch student's requests with course details
    // Handle case where access_requests table might not exist
    let requests = [];
    try {
      requests = await db
        .select({
          id: accessRequests.id,
          courseId: accessRequests.courseId,
          courseTitle: courses.title,
          reason: accessRequests.reason,
          status: accessRequests.status,
          requestedAt: accessRequests.requestedAt,
          reviewedAt: accessRequests.reviewedAt,
        })
        .from(accessRequests)
        .innerJoin(courses, eq(accessRequests.courseId, courses.id))
        .where(eq(accessRequests.studentId, decoded.id))
        .orderBy(desc(accessRequests.requestedAt));
    } catch (error: any) {
      // Table doesn't exist - return empty array
      logger.warn('⚠️ access_requests table not accessible, returning empty requests:', error?.message);
      requests = [];
    }

    return NextResponse.json({ requests });
  } catch (error: any) {
    logger.error('Get student requests error:', error);
    logger.error('Error details:', error?.message, error?.stack);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// POST - Create new access request
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    const decoded = auth.user;

    const { courseId, reason } = await request.json();

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    const courseIdNum = parseInt(courseId);
    if (isNaN(courseIdNum)) {
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Check if already enrolled (any source)
    // Wrap queries in try-catch to handle missing tables
    let existingEnrollment = [];
    let existingProgress = [];

    try {
      existingEnrollment = await db.select().from(enrollments)
        .where(and(
          eq(enrollments.userId, decoded.id),
          eq(enrollments.courseId, courseIdNum),
          eq(enrollments.status, 'active')
        ));
    } catch (error: any) {
      if (error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01' ||
        error.message?.includes('enrollments')) {
        logger.warn('⚠️ enrollments table does not exist, continuing without it');
      } else {
        throw error;
      }
    }

    try {
      existingProgress = await db.select().from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, courseIdNum)
        ));
    } catch (error: any) {
      if (error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01' ||
        error.message?.includes('student_progress')) {
        logger.warn('⚠️ student_progress table does not exist, continuing without it');
      } else {
        throw error;
      }
    }

    if (existingEnrollment.length > 0 || existingProgress.length > 0) {
      return NextResponse.json(
        { message: 'You are already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if request already exists (any status)
    let existing: any[] = [];
    try {
      existing = await db
        .select()
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, decoded.id),
            eq(accessRequests.courseId, courseIdNum)
          )
        );
    } catch (error: any) {
      // If access_requests table doesn't exist, treat as no existing requests
      if (error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01' ||
        error.message?.includes('access_requests')) {
        logger.warn('⚠️ access_requests table does not exist, treating as no existing requests');
        existing = [];
      } else {
        throw error;
      }
    }

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'pending') {
        return NextResponse.json(
          { message: 'You already have a pending request for this course' },
          { status: 400 }
        );
      } else if (status === 'approved') {
        // Check if student is actually enrolled - if not, delete old approved request and allow new request
        let enrollmentCheck = [];
        try {
          enrollmentCheck = await db
            .select()
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, decoded.id),
                eq(studentProgress.courseId, courseIdNum)
              )
            )
            .limit(1);
        } catch (error: any) {
          // If student_progress table doesn't exist, treat as not enrolled
          if (error.message?.includes('does not exist') ||
            error.message?.includes('relation') ||
            error.code === '42P01' ||
            error.message?.includes('student_progress')) {
            logger.warn('⚠️ student_progress table does not exist, treating as not enrolled');
            enrollmentCheck = [];
          } else {
            throw error;
          }
        }

        if (enrollmentCheck.length > 0) {
          // Student is enrolled, delete the old approved request
          await db.delete(accessRequests).where(eq(accessRequests.id, existing[0].id));
          logger.info(`🗑️ Deleted old approved request #${existing[0].id} - student is already enrolled`);
          return NextResponse.json(
            { message: 'You are already enrolled in this course' },
            { status: 400 }
          );
        } else {
          // Approved but not enrolled - delete old request and allow new one
          await db.delete(accessRequests).where(eq(accessRequests.id, existing[0].id));
          logger.info(`🗑️ Deleted old approved request #${existing[0].id} - student not enrolled, allowing new request`);
        }
      } else if (status === 'rejected') {
        // Allow re-request for rejected courses after deleting old request
        await db.delete(accessRequests).where(eq(accessRequests.id, existing[0].id));
        logger.info(`🗑️ Deleted old rejected request #${existing[0].id}`);
      }
    }

    // Verify course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, parseInt(courseId)))
      .limit(1);

    if (!course) {
      logger.error('❌ Course not found:', courseId);
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    logger.info('📝 Creating access request:', {
      studentId: decoded.id,
      studentEmail: decoded.email,
      courseId: parseInt(courseId),
      courseTitle: course.title,
      reason: reason || 'Requesting access to this course',
    });

    // Create new request
    let result;
    try {
      result = await db.insert(accessRequests).values({
        studentId: decoded.id,
        courseId: parseInt(courseId),
        reason: reason || 'Requesting access to this course',
        status: 'pending',
      }).returning();
    } catch (error: any) {
      // If access_requests table doesn't exist, return error
      if (error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01' ||
        error.message?.includes('access_requests')) {
        logger.error('❌ access_requests table does not exist, cannot create request');
        return NextResponse.json(
          { message: 'Request system is not available. Please contact support.' },
          { status: 503 }
        );
      } else {
        throw error;
      }
    }

    logger.info('✅ Access request created successfully:', {
      id: result[0].id,
      studentId: result[0].studentId,
      courseId: result[0].courseId,
      status: result[0].status,
      requestedAt: result[0].requestedAt,
    });

    // Verify the request was actually created and is queryable
    const verifyRequest = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, result[0].id))
      .limit(1);

    if (verifyRequest.length === 0) {
      logger.error('❌ CRITICAL: Request was created but cannot be queried!');
      return NextResponse.json(
        { message: 'Request created but verification failed', error: 'Database consistency issue' },
        { status: 500 }
      );
    }

    logger.info('✅ Request verification passed - request is queryable with ID:', result[0].id);

    return NextResponse.json({
      message: 'Request submitted successfully',
      request: result[0],
    });
  } catch (error: any) {
    logger.error('Create request error:', error);
    return NextResponse.json(
      { message: 'Failed to submit request', error: error.message },
      { status: 500 }
    );
  }
}
