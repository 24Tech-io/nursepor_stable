import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses, questionBanks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Debug endpoint to check all courses in the database
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    // Get ALL courses (not filtered)
    const allCourses = await db.select().from(courses);

    // Get published courses
    const publishedCourses = await db.select().from(courses).where(eq(courses.status, 'published'));

    // Get Nurse Pro course specifically
    const nurseProCourses = await db.select().from(courses).where(eq(courses.title, 'Nurse Pro'));

    // Get Q-Bank course specifically
    const qbankCourses = await db.select().from(courses).where(eq(courses.title, 'Q-Bank'));

    // Get question banks
    const allQuestionBanks = await db.select().from(questionBanks);

    return NextResponse.json({
      success: true,
      summary: {
        totalCourses: allCourses.length,
        publishedCourses: publishedCourses.length,
        nurseProCourses: nurseProCourses.length,
        qbankCourses: qbankCourses.length,
        questionBanks: allQuestionBanks.length,
      },
      allCourses: allCourses.map((c) => ({
        id: c.id.toString(),
        title: c.title,
        pricing: c.pricing,
        status: c.status,
        isRequestable: c.isRequestable,
        isDefaultUnlocked: c.isDefaultUnlocked,
        createdAt: c.createdAt?.toISOString(),
      })),
      publishedCourses: publishedCourses.map((c) => ({
        id: c.id.toString(),
        title: c.title,
        pricing: c.pricing,
        status: c.status,
      })),
      nurseProCourses: nurseProCourses.map((c) => ({
        id: c.id.toString(),
        title: c.title,
        pricing: c.pricing,
        status: c.status,
      })),
      questionBanks: allQuestionBanks.map((qb) => ({
        id: qb.id.toString(),
        courseId: qb.courseId.toString(),
        name: qb.name,
      })),
    });
  } catch (error: any) {
    console.error('Debug courses error:', error);
    return NextResponse.json(
      {
        message: 'Failed to debug courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
