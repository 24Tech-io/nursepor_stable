import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Cleanup Orphaned Enrollments
 * Removes student progress entries that reference non-existent courses or students
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

    // Get all progress entries
    const allProgress = await db
      .select({
        id: studentProgress.id,
        studentId: studentProgress.studentId,
        courseId: studentProgress.courseId,
      })
      .from(studentProgress);

    console.log(`🔍 Found ${allProgress.length} total progress entries`);

    // Find orphaned entries (student or course doesn't exist)
    const orphanedEntries: any[] = [];

    for (const progress of allProgress) {
      // Check if student exists
      const [student] = await db
        .select()
        .from(users)
        .where(eq(users.id, progress.studentId))
        .limit(1);

      // Check if course exists
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, progress.courseId))
        .limit(1);

      if (!student || !course) {
        orphanedEntries.push(progress);
        console.log(`⚠️ Orphaned entry found: Progress ID ${progress.id}, Student ID ${progress.studentId}, Course ID ${progress.courseId}`);
      }
    }

    // Delete orphaned entries
    let deletedCount = 0;
    for (const orphaned of orphanedEntries) {
      await db
        .delete(studentProgress)
        .where(eq(studentProgress.id, orphaned.id));
      deletedCount++;
      console.log(`✅ Deleted orphaned progress entry ID: ${orphaned.id}`);
    }

    // Also check for progress entries where course is not published
    const unpublishedProgress = await db
      .select({
        id: studentProgress.id,
        courseId: studentProgress.courseId,
        courseStatus: courses.status,
      })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(
        and(
          sql`${courses.status} != 'published'`,
          sql`${courses.status} != 'active'`
        )
      );

    console.log(`🔍 Found ${unpublishedProgress.length} progress entries for unpublished courses`);

    // Optionally delete unpublished course enrollments (commented out for safety)
    // Uncomment if you want to remove enrollments from draft courses
    // for (const unpub of unpublishedProgress) {
    //   await db.delete(studentProgress).where(eq(studentProgress.id, unpub.id));
    //   deletedCount++;
    // }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Found ${orphanedEntries.length} orphaned entries, deleted ${deletedCount}`,
      deletedCount,
      orphanedEntries: orphanedEntries.map(e => ({
        id: e.id,
        studentId: e.studentId,
        courseId: e.courseId,
      })),
      unpublishedProgressCount: unpublishedProgress.length,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to cleanup orphaned enrollments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


