import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Bulk Update Course Status Endpoint
 * 
 * Allows admins to bulk update course statuses to 'published' (or any other status)
 * 
 * POST /api/admin/courses/bulk-update-status
 * 
 * Body options:
 * - status: 'published' | 'draft' | 'archived' (default: 'published')
 * - courseIds: number[] (optional) - specific course IDs to update
 * - fromStatus: string (optional) - only update courses with this status
 * - excludeIds: number[] (optional) - course IDs to exclude
 * - excludeTitles: string[] (optional) - course titles to exclude (e.g., ['Nurse Pro', 'Q-Bank'])
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const body = await request.json().catch(() => ({}));

    const {
      status = 'published',
      courseIds,
      fromStatus,
      excludeIds = [],
      excludeTitles = ['Nurse Pro', 'Q-Bank'],
    } = body;

    // Validate status
    const validStatuses = ['published', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      }, { status: 400 });
    }

    // Build query conditions
    let allCourses: any[] = [];

    // If specific course IDs provided
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      const validIds = courseIds.filter((id: any) => typeof id === 'number' || !isNaN(Number(id)));
      if (validIds.length > 0) {
        allCourses = await db
          .select()
          .from(courses)
          .where(inArray(courses.id, validIds.map((id: any) => Number(id))));
      }
    } else if (fromStatus) {
      // Filter by current status
      allCourses = await db
        .select()
        .from(courses)
        .where(eq(courses.status, fromStatus));
    } else {
      // Get all courses
      allCourses = await db.select().from(courses);
    }

    // Apply exclusions
    let coursesToUpdate = allCourses.filter((course: any) => {
      // Exclude by ID
      if (excludeIds.includes(course.id)) {
        return false;
      }
      // Exclude by title
      if (excludeTitles.includes(course.title)) {
        return false;
      }
      // Don't update if already has target status
      if (course.status === status) {
        return false;
      }
      return true;
    });

    if (coursesToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No courses to update',
        updatedCount: 0,
        courses: [],
      });
    }

    // Bulk update using SQL for better performance
    const courseIdsToUpdate = coursesToUpdate.map((c: any) => c.id);
    
    const updatedCourses = await db
      .update(courses)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(inArray(courses.id, courseIdsToUpdate))
      .returning();

    logger.info(`✅ Bulk updated ${updatedCourses.length} courses to status: ${status}`);
    updatedCourses.forEach((course: any) => {
      logger.info(`  - ${course.title} (ID: ${course.id})`);
    });

    // If publishing courses, notify students
    if (status === 'published') {
      try {
        const { notifyNewCoursePublished } = await import('@/lib/sync-service');
        for (const course of updatedCourses) {
          await notifyNewCoursePublished(course.id, course.title);
        }
      } catch (notifyError) {
        logger.warn('Failed to send notifications:', notifyError);
        // Don't fail the request if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCourses.length} course(s) to '${status}'`,
      updatedCount: updatedCourses.length,
      courses: updatedCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
      })),
    });
  } catch (error: any) {
    logger.error('Bulk update course status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update course statuses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}

/**
 * GET endpoint to preview which courses would be updated
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'published';
    const fromStatus = searchParams.get('fromStatus');
    const excludeTitles = searchParams.get('excludeTitles')?.split(',') || ['Nurse Pro', 'Q-Bank'];

    // Get all courses
    let coursesList = await db.select().from(courses);

    // Apply filters
    let filteredCourses = coursesList.filter((course: any) => {
      if (fromStatus && course.status !== fromStatus) {
        return false;
      }
      if (excludeTitles.includes(course.title)) {
        return false;
      }
      if (course.status === status) {
        return false; // Already has target status
      }
      return true;
    });

    return NextResponse.json({
      preview: true,
      targetStatus: status,
      count: filteredCourses.length,
      courses: filteredCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        currentStatus: c.status,
        willUpdateTo: status,
      })),
    });
  } catch (error: any) {
    logger.error('Preview bulk update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to preview updates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}

