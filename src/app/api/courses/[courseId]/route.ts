import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({
      course: {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: course.status,
        isRequestable: course.isRequestable,
        isDefaultUnlocked: course.isDefaultUnlocked,
        isPublic: course.isPublic,
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get course error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);
    const body = await request.json();
    console.log('📝 [PUT /api/courses/:id] Request received:', {
      courseId,
      title: body.title,
      description: body.description?.substring(0, 50) + '...',
      instructor: body.instructor,
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

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Update course (any admin can edit any course)
    // Normalize status: "Active" or "active" -> "published" for consistency
    let newStatus = status !== undefined ? status : existingCourse.status;

    // Normalize status values to ensure consistency
    if (newStatus === 'Active' || newStatus === 'active' || newStatus === 'ACTIVE') {
      newStatus = 'published';
      console.log(`🔄 Normalizing status: "${status}" → "published"`);
    }

    console.log(`📝 Updating course ID ${courseId}: ${existingCourse.title}`);
    console.log(`📝 Status change: ${existingCourse.status} → ${newStatus}`);

    const [updatedCourse] = await db
      .update(courses)
      .set({
        title: title || existingCourse.title,
        description: description || existingCourse.description,
        instructor: instructor || existingCourse.instructor,
        thumbnail: thumbnail !== undefined ? thumbnail : existingCourse.thumbnail,
        pricing:
          pricing !== undefined ? (pricing ? parseFloat(pricing) : null) : existingCourse.pricing,
        status: newStatus,
        isRequestable: isRequestable !== undefined ? isRequestable : existingCourse.isRequestable,
        isDefaultUnlocked:
          isDefaultUnlocked !== undefined ? isDefaultUnlocked : existingCourse.isDefaultUnlocked,
        isPublic: isPublic !== undefined ? isPublic : existingCourse.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    console.log(`✅ Course updated: ${updatedCourse.title} (Status: ${updatedCourse.status})`);

    if (newStatus === 'published' && existingCourse.status !== 'published') {
      console.log(`📢 Course "${updatedCourse.title}" is now published and visible to students!`);

      // Notify all students about the newly published course
      try {
        const { notifyNewCoursePublished } = await import('@/lib/sync-service');
        await notifyNewCoursePublished(updatedCourse.id, updatedCourse.title);
      } catch (notifError) {
        console.error('Failed to notify students about published course:', notifError);
        // Don't fail the update if notification fails
      }
    }

    // Log activity
    const token = request.cookies.get('token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        await logActivity({
          adminId: decoded.id,
          adminName: decoded.name,
          action: 'updated',
          entityType: 'course',
          entityId: courseId,
          entityName: updatedCourse.title,
          details: {
            changes: {
              title:
                title !== existingCourse.title
                  ? { from: existingCourse.title, to: title }
                  : undefined,
              status:
                status !== existingCourse.status
                  ? { from: existingCourse.status, to: status }
                  : undefined,
            },
          },
        });
      }
    }

    return NextResponse.json({
      course: {
        id: updatedCourse.id.toString(),
        title: updatedCourse.title,
        description: updatedCourse.description,
        instructor: updatedCourse.instructor,
        thumbnail: updatedCourse.thumbnail,
        pricing: updatedCourse.pricing || 0,
        status: updatedCourse.status,
        isRequestable: updatedCourse.isRequestable,
        createdAt: updatedCourse.createdAt?.toISOString(),
        updatedAt: updatedCourse.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    return NextResponse.json(
      {
        message: 'Failed to update course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      console.error('Delete course: No token found');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      console.error('Delete course: Invalid token or not admin', { decoded });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    if (isNaN(courseId)) {
      console.error('Delete course: Invalid course ID', params.courseId);
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
    }

    console.log(`Attempting to delete course with ID: ${courseId}`);

    // Check if course exists
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      console.error('Delete course: Course not found', courseId);
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    console.log(`Deleting course: ${existingCourse.title} (ID: ${courseId})`);

    // Delete course (any admin can delete any course)
    await db.delete(courses).where(eq(courses.id, courseId));

    console.log(`Successfully deleted course with ID: ${courseId}`);

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'deleted',
      entityType: 'course',
      entityId: courseId,
      entityName: existingCourse.title,
    });

    return NextResponse.json({
      message: 'Course deleted successfully',
      deletedId: courseId,
    });
  } catch (error: any) {
    console.error('Delete course error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        message: 'Failed to delete course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH handler (alias for PUT for compatibility with admin UI)
export async function PATCH(request: NextRequest, { params }: { params: { courseId: string } }) {
  return PUT(request, { params });
}
