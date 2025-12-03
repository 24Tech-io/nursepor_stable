import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireOwnershipOrAdmin } from '@/lib/auth-helpers';
import { securityLogger } from '@/lib/logger';
import { getClientIP } from '@/lib/security-middleware';

export async function GET(request: Request) {
  try {
    // TODO: Add pagination
    const allCourses = await db.query.courses.findMany({
      orderBy: [desc(courses.createdAt)],
      with: {
        modules: true,
      },
    });

    return NextResponse.json({ courses: allCourses });
  } catch (error) {
    console.error('Get courses error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = getClientIP(request);

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    // Create course
    const newCourse = await db
      .insert(courses)
      .values({
        title: body.title,
        description: body.description || '',
        instructor: body.instructor || 'Nurse Pro Academy',
        pricing: body.pricing || 0,
        status: body.status || 'draft',
        isDefaultUnlocked: body.isDefaultUnlocked || false,
        isRequestable: body.isRequestable !== false,
        thumbnail: body.thumbnail || null,
      })
      .returning();

    securityLogger.info('Course Created', { courseId: newCourse[0].id, title: body.title });

    return NextResponse.json({
      message: 'Course created successfully',
      course: newCourse[0],
    });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
