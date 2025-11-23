import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * API to fix course statuses - converts "active" to "published" for consistency
 * This ensures courses marked as "Active" in admin UI are visible to students
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: dbError.message || 'Database is not available',
        },
        { status: 500 }
      );
    }

    // Find all courses with "active" status (case-insensitive)
    const activeCourses = await db
      .select()
      .from(courses)
      .where(
        or(
          eq(courses.status, 'active'),
          eq(courses.status, 'Active'),
          eq(courses.status, 'ACTIVE')
        )
      );

    console.log(`🔧 Found ${activeCourses.length} courses with "active" status`);

    // Update them to "published"
    const updated = [];
    for (const course of activeCourses) {
      await db
        .update(courses)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(courses.id, course.id));

      updated.push({
        id: course.id,
        title: course.title,
        oldStatus: course.status,
        newStatus: 'published',
      });

      console.log(`✅ Updated course "${course.title}" from "${course.status}" to "published"`);
    }

    // Also check for any other variations
    const allCourses = await db.select().from(courses);
    const statusVariations: Record<string, number> = {};
    allCourses.forEach((c: any) => {
      const status = c.status || 'null';
      statusVariations[status] = (statusVariations[status] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      updated: updated.length,
      courses: updated,
      summary: {
        totalCourses: allCourses.length,
        statusBreakdown: statusVariations,
        message: updated.length > 0
          ? `Updated ${updated.length} course(s) from "active" to "published"`
          : 'No courses needed updating',
      },
    });
  } catch (error: any) {
    console.error('❌ Fix course statuses error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


