import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { securityLogger } from '@/lib/logger';
import { getClientIP } from '@/lib/security-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const db = await getDatabaseWithRetry();
        const allCourses = await db.select().from(courses).orderBy(desc(courses.createdAt));

        return NextResponse.json({ courses: allCourses });
    } catch (error) {
        logger.error('Get courses error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }

    // ⚡ PERFORMANCE: If only count is needed, use efficient COUNT query
    if (countOnly) {
      const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(courses);

      console.log(`⚡ [Admin API] Fast count: ${result.count} courses`);
      return NextResponse.json({ count: result.count });
    }

    const allCourses = await db.select().from(courses).orderBy(desc(courses.createdAt));

    console.log(`📚 [Admin API] Found ${allCourses.length} total courses`);

    return NextResponse.json({
      courses: allCourses.map((course: any) => ({
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: course.status,
        isRequestable: course.isRequestable,
        isPublic: course.isPublic,
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('❌ Get courses error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Check if it's a database connection error
    if (
      error.message?.includes('Database is not available') ||
      error.message?.includes('DATABASE_URL')
    ) {
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: 'Database is not available. Please check your DATABASE_URL in .env.local',
          courses: [], // Return empty array instead of failing
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Failed to get courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        courses: [], // Return empty array instead of failing
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
    try {
        const adminResult = await requireAdmin(request);
        if (adminResult instanceof NextResponse) {
            return adminResult;
        }
        const adminUser = adminResult.user;

        // Validate request body
        const bodyValidation = await extractAndValidate(request, createCourseSchema);
        if (!bodyValidation.success) {
            return bodyValidation.error;
        }
        const body = bodyValidation.data;
        const ip = getClientIP(request);
        const db = await getDatabaseWithRetry();

        // Create course
        const newCourse = await db.insert(courses).values({
            title: body.title,
            description: body.description || '',
            instructor: body.instructor || 'Nurse Pro Academy',
            pricing: body.pricing || 0,
            status: body.status || 'draft',
            isDefaultUnlocked: body.isDefaultUnlocked || false,
            isRequestable: body.isRequestable !== false,
            thumbnail: body.thumbnail || null,
        }).returning();

        securityLogger.info('Course Created', { courseId: newCourse[0].id, title: body.title, userId: (adminUser as any).id, ip });

        return NextResponse.json({
            message: 'Course created successfully',
            course: newCourse[0]
        });

    } catch (error) {
        logger.error('Create course error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📝 [POST /api/courses] Request received:', {
      title: body.title,
      description: body.description?.substring(0, 50) + '...',
      instructor: body.instructor,
      hasTitle: !!body.title,
      hasDescription: !!body.description,
      hasInstructor: !!body.instructor,
    });

    const {
      title,
      description,
      instructor,
      thumbnail,
      pricing,
      status,
      isRequestable,
      isDefaultUnlocked,
      isPublic,
    } = body;

    if (!title || !description || !instructor) {
      console.error('❌ Validation failed:', {
        title: !!title,
        description: !!description,
        instructor: !!instructor,
      });
      return NextResponse.json(
        { message: 'Title, description, and instructor are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Default to 'published' so courses are immediately visible to students
    // Admin can change to 'draft' if they want to work on it before publishing
    // Normalize status: "Active" or "active" -> "published" for consistency
    let courseStatus = status || 'published';
    if (courseStatus === 'Active' || courseStatus === 'active' || courseStatus === 'ACTIVE') {
      courseStatus = 'published';
      console.log(`🔄 Normalizing status: "${status}" → "published"`);
    }

    console.log(`📝 Creating course: ${title} with status: ${courseStatus}`);

    const [newCourse] = await db
      .insert(courses)
      .values({
        title,
        description,
        instructor,
        thumbnail: thumbnail || null,
        pricing: pricing ? parseFloat(pricing) : null,
        status: courseStatus,
        isRequestable: isRequestable !== undefined ? isRequestable : true,
        isDefaultUnlocked: isDefaultUnlocked !== undefined ? isDefaultUnlocked : false,
        isPublic: isPublic !== undefined ? isPublic : false,
      })
      .returning();

    console.log(
      `✅ Course created successfully: ${newCourse.title} (ID: ${newCourse.id}, Status: ${newCourse.status})`
    );

    // AUTO-CREATE Q-BANK FOLDER for this course
    try {
      const [newQBank] = await db
        .insert(questionBanks)
        .values({
          courseId: newCourse.id,
          name: `${newCourse.title} Q-Bank`,
          description: `Practice questions for ${newCourse.title}`,
          isActive: true,
        })
        .returning();
      
      console.log(`✅ Auto-created Q-Bank folder (ID: ${newQBank.id}) for course ${newCourse.id}`);
    } catch (qbankError: any) {
      console.error('⚠️ Failed to auto-create Q-Bank folder:', qbankError.message);
      // Don't fail course creation if Q-Bank creation fails
    }

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
        console.error('Failed to notify students about new course:', notifError);
        // Don't fail course creation if notification fails
      }
    }

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create course error:', error);
    return NextResponse.json(
      {
        message: 'Failed to create course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

