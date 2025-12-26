import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, questionBanks } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

/**
 * This endpoint fixes/creates the Nurse Pro course in the database.
 * It ensures the course exists, is published, and is free.
 */
export async function POST(request: NextRequest) {
  try {
    let db;
    try {
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      logger.error('Database connection error in fix-course:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection error',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
        { status: 500 }
      );
    }

    // Check for existing courses with either "Nurse Pro" or "Q-Bank" title
    const existingCourses = await db
      .select()
      .from(courses)
      .where(
        or(
          eq(courses.title, 'Nurse Pro'),
          eq(courses.title, 'Q-Bank')
        )
      );

    let course;
    
    if (existingCourses.length > 0) {
      // Use the first existing course
      course = existingCourses[0];
      
      // Update it to ensure it's correct
      await db
        .update(courses)
        .set({
          title: 'Nurse Pro',
          description: 'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets. Master nursing concepts and prepare for your exams.',
          instructor: 'Nurse Pro Academy',
          pricing: 0, // Free
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false,
        })
        .where(eq(courses.id, course.id));
      
      course = {
        ...course,
        title: 'Nurse Pro',
        pricing: 0,
        status: 'published',
      };
    } else {
      // Create new course
      [course] = await db
        .insert(courses)
        .values({
          title: 'Nurse Pro',
          description: 'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets. Master nursing concepts and prepare for your exams.',
          instructor: 'Nurse Pro Academy',
          thumbnail: null,
          pricing: 0, // Free enrollment
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false,
        })
        .returning();
    }

    // Ensure question bank exists
    const existingQBank = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, course.id))
      .limit(1);

    let questionBank;
    if (existingQBank.length === 0) {
      [questionBank] = await db
        .insert(questionBanks)
        .values({
          courseId: course.id,
          name: 'Nurse Pro Q-Bank',
          description: 'Comprehensive question bank for nursing exam preparation',
          isActive: true,
        })
        .returning();
    } else {
      questionBank = existingQBank[0];
    }

    // Verify the course is in the database and fetch fresh data
    const verifyCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.id, course.id))
      .limit(1);

    // Get all published courses to verify
    const allPublishedCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'));

    // Get fresh course data
    const freshCourse = verifyCourse[0];

    return NextResponse.json({
      success: true,
      message: 'Nurse Pro course fixed/created successfully',
      course: {
        id: freshCourse.id.toString(),
        title: freshCourse.title,
        pricing: freshCourse.pricing,
        status: freshCourse.status,
        isRequestable: freshCourse.isRequestable,
        isDefaultUnlocked: freshCourse.isDefaultUnlocked,
      },
      questionBank: {
        id: questionBank.id.toString(),
        name: questionBank.name,
      },
      verified: verifyCourse.length > 0,
      publishedCoursesCount: allPublishedCourses.length,
      allPublishedCourses: allPublishedCourses.map(c => ({
        id: c.id.toString(),
        title: c.title,
        pricing: c.pricing,
        status: c.status,
      })),
      allCourses: await db.select().from(courses).then(cs => cs.map(c => ({
        id: c.id.toString(),
        title: c.title,
        pricing: c.pricing,
        status: c.status,
      }))),
    });
  } catch (error: any) {
    logger.error('Fix Nurse Pro course error:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    return NextResponse.json(
      {
        message: 'Failed to fix Nurse Pro course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

