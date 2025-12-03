import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * Bulk Publish Endpoint
 * Publishes all draft courses to make them visible to students
 * Useful for syncing courses after creation
 */
export async function POST(request: NextRequest) {
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

    // Get all draft courses (excluding Nurse Pro/Q-Bank)
    const draftCourses = await db.select().from(courses).where(eq(courses.status, 'draft'));

    const validDraftCourses = draftCourses.filter(
      (c: any) => c.title !== 'Nurse Pro' && c.title !== 'Q-Bank'
    );

    if (validDraftCourses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No draft courses to publish',
        publishedCount: 0,
      });
    }

    // Publish all draft courses
    const publishedIds: number[] = [];
    for (const course of validDraftCourses) {
      await db
        .update(courses)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(courses.id, course.id));
      publishedIds.push(course.id);
      console.log(`✅ Published course: ${course.title} (ID: ${course.id})`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully published ${publishedIds.length} course(s)`,
      publishedCount: publishedIds.length,
      publishedCourses: validDraftCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
      })),
    });
  } catch (error: any) {
    console.error('Publish all error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to publish courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
