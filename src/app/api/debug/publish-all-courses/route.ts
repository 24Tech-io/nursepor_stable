import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase, getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Publish all courses (admin only)
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

    const db = await getDatabaseWithRetry();

    // Fetch all courses
    const allCourses = await db.select().from(courses);

    console.log(`📚 Found ${allCourses.length} courses`);

    if (allCourses.length === 0) {
      return NextResponse.json({ message: 'No courses found' }, { status: 404 });
    }

    // Publish all courses
    const results: Array<{ id: number; title: string; wasStatus: string; nowStatus: string }> = [];
    for (const course of allCourses) {
      await db
        .update(courses)
        .set({
          status: 'published',
          isPublic: true,
          isRequestable: true,
        })
        .where(eq(courses.id, course.id));
      
      results.push({
        id: course.id,
        title: course.title,
        wasStatus: course.status,
        nowStatus: 'published',
      });
      
      console.log(`✅ Published: ${course.title}`);
    }

    return NextResponse.json({
      message: `Successfully published ${allCourses.length} courses`,
      courses: results,
    });
  } catch (error: any) {
    console.error('Publish all courses error:', error);
    return NextResponse.json(
      { message: 'Failed to publish courses', error: error.message },
      { status: 500 }
    );
  }
}

