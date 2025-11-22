import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses, questionBanks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * This endpoint ensures the Nurse Pro course exists.
 * It can be called by anyone (students, admins) to auto-create the course if it doesn't exist.
 * This makes the Nurse Pro course always available without requiring admin setup.
 * The course is free (pricing = 0) and includes a Q-Bank feature.
 */
export async function POST(request: NextRequest) {
  try {
    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('Database connection error in ensure-course:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection error',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
        { status: 500 }
      );
    }

    // Check if Nurse Pro course already exists (check both "Nurse Pro" and "Q-Bank" for backward compatibility)
    const existingCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.title, 'Nurse Pro'))
      .limit(1);
    
    // If not found, check for "Q-Bank" and rename it
    let course = existingCourse.length > 0 ? existingCourse[0] : null;
    if (!course) {
      const qbankCourse = await db
        .select()
        .from(courses)
        .where(eq(courses.title, 'Q-Bank'))
        .limit(1);
      
      if (qbankCourse.length > 0) {
        // Rename Q-Bank to Nurse Pro
        await db
          .update(courses)
          .set({ title: 'Nurse Pro' })
          .where(eq(courses.id, qbankCourse[0].id));
        course = { ...qbankCourse[0], title: 'Nurse Pro' };
      }
    }

    if (course) {
      // Ensure it's published
      if (course.status !== 'published') {
        await db
          .update(courses)
          .set({ status: 'published' })
          .where(eq(courses.id, course.id));
        course.status = 'published';
      }

      // Ensure it's free
      if (course.pricing !== 0) {
        await db
          .update(courses)
          .set({ pricing: 0 })
          .where(eq(courses.id, course.id));
        course.pricing = 0;
      }

      // Ensure question bank exists
      const existingQBank = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.courseId, course.id))
        .limit(1);

      if (existingQBank.length === 0) {
        await db.insert(questionBanks).values({
          courseId: course.id,
          name: 'Nurse Pro Q-Bank',
          description: 'Comprehensive question bank for nursing exam preparation',
          isActive: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Nurse Pro course already exists',
        course: {
          id: course.id.toString(),
          title: course.title,
        },
      });
    }

    // Create the Nurse Pro course if it doesn't exist
    const [newCourse] = await db
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

    // Create question bank for the course
    await db.insert(questionBanks).values({
      courseId: newCourse.id,
      name: 'Nurse Pro Q-Bank',
      description: 'Comprehensive question bank for nursing exam preparation',
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Nurse Pro course created successfully',
      course: {
        id: newCourse.id.toString(),
        title: newCourse.title,
      },
    });
  } catch (error: any) {
    console.error('Ensure Nurse Pro course error:', error);
    return NextResponse.json(
      {
        message: 'Failed to ensure Nurse Pro course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

