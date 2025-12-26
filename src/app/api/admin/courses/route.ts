import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('admin_token')?.value;

    if (!token) {
      logger.warn('⚠️ [Admin Courses API] No token found');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (tokenError: any) {
      logger.error('❌ [Admin Courses API] Token verification failed:', tokenError);
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!decoded || decoded.role !== 'admin') {
      logger.warn('⚠️ [Admin Courses API] Non-admin user attempted access:', decoded?.role);
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    let db;
    try {
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      logger.error('❌ Database initialization error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: dbError.message || 'Database is not available',
          hint: 'Please check your DATABASE_URL in .env.local',
          courses: [],
          count: 0
        },
        { status: 500 }
      );
    }

    // ⚡ PERFORMANCE: If only count is needed, use efficient COUNT query
    if (countOnly) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(courses);

      logger.info(`⚡ [Admin API] Fast count: ${result.count} courses`);
      return NextResponse.json({ count: result.count });
    }

    let allCourses;
    try {
      allCourses = await db
        .select()
        .from(courses)
        .orderBy(desc(courses.createdAt));

      logger.info(`📚 [Admin API] Found ${allCourses.length} total courses`);
    } catch (queryError: any) {
      logger.error('❌ [Admin API] Database query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    try {
      const mappedCourses = allCourses.map((course: any) => {
        try {
          return {
            id: course.id?.toString() || String(course.id),
            title: course.title || '',
            description: course.description || '',
            instructor: course.instructor || '',
            thumbnail: course.thumbnail || null,
            pricing: course.pricing || 0,
            status: course.status || 'draft',
            isRequestable: course.isRequestable ?? true,
            isPublic: course.isPublic ?? false,
            createdAt: course.createdAt ? (course.createdAt instanceof Date ? course.createdAt.toISOString() : course.createdAt) : null,
            updatedAt: course.updatedAt ? (course.updatedAt instanceof Date ? course.updatedAt.toISOString() : course.updatedAt) : null,
          };
        } catch (mapError: any) {
          logger.error('❌ [Admin API] Error mapping course:', course.id, mapError);
          return null;
        }
      }).filter((c: any) => c !== null);

      return NextResponse.json({
        courses: mappedCourses,
      });
    } catch (mapError: any) {
      logger.error('❌ [Admin API] Error mapping courses:', mapError);
      throw new Error(`Failed to map courses: ${mapError.message}`);
    }
  } catch (error: any) {
    logger.error('❌ Get courses error:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Check if it's a database connection error
    if (error.message?.includes('Database is not available') ||
      error.message?.includes('DATABASE_URL')) {
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: 'Database is not available. Please check your DATABASE_URL in .env.local',
          courses: [] // Return empty array instead of failing
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Failed to get courses',
        error: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
        } : undefined,
        courses: [] // Return empty array instead of failing
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createCourseSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    logger.info('📝 [POST /api/courses] Request received:', {
      title: body.title,
      description: body.description?.substring(0, 50) + '...',
      instructor: body.instructor,
      hasTitle: !!body.title,
      hasDescription: !!body.description,
      hasInstructor: !!body.instructor
    });

    const { title, description, instructor, thumbnail, pricing, status, isRequestable, isDefaultUnlocked, isPublic } = body;

    const db = await getDatabaseWithRetry();

    // Default to 'published' so courses are immediately visible to students
    // Admin can change to 'draft' if they want to work on it before publishing
    // Normalize status: "Active" or "active" -> "published" for consistency
    let courseStatus = status || 'published';
    if (String(courseStatus).toLowerCase() === 'active') {
      courseStatus = 'published';
      logger.info(`🔄 Normalizing status: "${status}" → "published"`);
    }

    logger.info(`📝 Creating course: ${title} with status: ${courseStatus}`);

    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        instructor,
        thumbnail: thumbnail || null,
        pricing: pricing ? (typeof pricing === 'number' ? pricing : parseFloat(pricing)) : null,
        status: courseStatus,
        isRequestable: isRequestable !== undefined ? isRequestable : true,
        isDefaultUnlocked: isDefaultUnlocked !== undefined ? isDefaultUnlocked : false,
        isPublic: isPublic !== undefined ? isPublic : false,
      })
      .returning();

    logger.info(`✅ Course created successfully: ${newCourse.title} (ID: ${newCourse.id}, Status: ${newCourse.status})`);

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'created',
      entityType: 'course',
      entityId: newCourse.id,
      entityName: newCourse.title,
    });

    // Notify all students if course is published
    if (courseStatus === 'published') {
      try {
        const { notifyNewCoursePublished } = await import('@/lib/sync-service');
        await notifyNewCoursePublished(newCourse.id, newCourse.title);
      } catch (notifError) {
        logger.error('Failed to notify students about new course:', notifError);
        // Don't fail course creation if notification fails
      }
    }

    return NextResponse.json({
      course: {
        id: newCourse.id.toString(),
        title: newCourse.title,
        description: newCourse.description,
        instructor: newCourse.instructor,
        thumbnail: newCourse.thumbnail,
        pricing: newCourse.pricing || 0,
        status: newCourse.status,
        isRequestable: newCourse.isRequestable,
        createdAt: newCourse.createdAt?.toISOString(),
        updatedAt: newCourse.updatedAt?.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Create course error:', error);
    return NextResponse.json(
      { message: 'Failed to create course', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
