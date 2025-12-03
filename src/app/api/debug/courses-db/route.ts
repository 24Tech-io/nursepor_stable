import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';

/**
 * Debug endpoint to check what courses are actually in the database
 * This helps verify sync between admin and student apps
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    // Get ALL courses from database (no filtering)
    const allCourses = await db.select().from(courses).orderBy(courses.createdAt);

    // Categorize by status
    const byStatus = allCourses.reduce((acc: any, course: any) => {
      const status = course.status || 'unknown';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push({
        id: course.id,
        title: course.title,
        status: course.status,
        isRequestable: course.isRequestable,
        isDefaultUnlocked: course.isDefaultUnlocked,
        createdAt: course.createdAt?.toISOString(),
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      totalCourses: allCourses.length,
      coursesByStatus: byStatus,
      allCourses: allCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description?.substring(0, 100),
        instructor: c.instructor,
        status: c.status,
        pricing: c.pricing,
        isRequestable: c.isRequestable,
        isDefaultUnlocked: c.isDefaultUnlocked,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })),
      databaseInfo: {
        hasConnection: !!db,
        databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
      },
      message: `Found ${allCourses.length} total courses in database. Published: ${byStatus['published']?.length || 0}, Draft: ${byStatus['draft']?.length || 0}`,
    });
  } catch (error: any) {
    console.error('Debug courses error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch courses from database',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
