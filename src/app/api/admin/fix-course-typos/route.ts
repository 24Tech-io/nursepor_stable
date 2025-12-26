import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { eq, like } from 'drizzle-orm';

/**
 * Admin endpoint to fix course title typos
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    // Find courses with "Dharmacology" typo
    const typoCourses = await db
      .select()
      .from(courses)
      .where(like(courses.title, '%Dharmacology%'));

    const fixedCourses: any[] = [];

    if (typoCourses.length > 0) {
      for (const course of typoCourses) {
        const correctedTitle = course.title.replace('Dharmacology', 'Pharmacology');

        await db
          .update(courses)
          .set({
            title: correctedTitle,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, course.id));

        fixedCourses.push({
          id: course.id,
          oldTitle: course.title,
          newTitle: correctedTitle,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message:
        fixedCourses.length > 0 ? `Fixed ${fixedCourses.length} course title(s)` : 'No typos found',
      fixedCourses,
    });
  } catch (error: any) {
    logger.error('Fix course typos error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fix course typos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




