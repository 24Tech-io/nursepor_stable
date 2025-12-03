import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * Sync Check Endpoint
 * Verifies that courses created by admins are visible to students
 * This helps debug sync issues between admin and student apps
 */
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

    // Get ALL courses from database
    const allCourses = await db.select().from(courses).orderBy(courses.createdAt);

    // Categorize courses
    const publishedCourses = allCourses.filter((c: any) => c.status === 'published');
    const draftCourses = allCourses.filter((c: any) => c.status === 'draft');
    const otherStatusCourses = allCourses.filter(
      (c: any) => c.status !== 'published' && c.status !== 'draft'
    );

    // Filter out Nurse Pro/Q-Bank
    const validPublishedCourses = publishedCourses.filter(
      (c: any) => c.title !== 'Nurse Pro' && c.title !== 'Q-Bank'
    );

    // Check database connection
    const dbInfo = {
      hasConnection: !!db,
      databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
    };

    return NextResponse.json({
      success: true,
      syncStatus: {
        totalCourses: allCourses.length,
        publishedCourses: publishedCourses.length,
        draftCourses: draftCourses.length,
        otherStatusCourses: otherStatusCourses.length,
        visibleToStudents: validPublishedCourses.length,
      },
      courses: {
        all: allCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          createdAt: c.createdAt?.toISOString(),
        })),
        published: publishedCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          status: c.status,
        })),
        draft: draftCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          status: c.status,
        })),
      },
      database: dbInfo,
      message:
        validPublishedCourses.length > 0
          ? `${validPublishedCourses.length} course(s) are visible to students`
          : 'No courses are visible to students. Make sure courses have status: "published"',
    });
  } catch (error: any) {
    console.error('Sync check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check sync status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
