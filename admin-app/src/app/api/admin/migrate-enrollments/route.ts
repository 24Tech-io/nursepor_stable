import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Admin-only endpoint to migrate enrollment data from studentProgress to enrollments table
 * This ensures all existing enrollments are in the enrollments table (source of truth)
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
    console.log('🚀 Starting migration from studentProgress to enrollments...');

    // Get all entries from studentProgress
    const allStudentProgress = await db.select().from(studentProgress);
    console.log(`📊 Found ${allStudentProgress.length} entries in studentProgress.`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const progressEntry of allStudentProgress) {
      try {
        // Check if enrollment already exists
        const existingEnrollment = await db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, progressEntry.studentId),
              eq(enrollments.courseId, progressEntry.courseId)
            )
          )
          .limit(1);

        if (existingEnrollment.length === 0) {
          // Create new enrollment entry
          await db.insert(enrollments).values({
            userId: progressEntry.studentId,
            courseId: progressEntry.courseId,
            status: 'active',
            progress: progressEntry.totalProgress || 0,
            enrolledAt: progressEntry.lastAccessed || new Date(),
            updatedAt: progressEntry.lastAccessed || new Date(),
          });
          created++;
        } else {
          // Update existing enrollment if progress is higher or lastAccessed is more recent
          const currentEnrollment = existingEnrollment[0];
          const progressValue = progressEntry.totalProgress || 0;
          const currentProgress = currentEnrollment.progress || 0;
          
          if (
            progressValue > currentProgress ||
            (progressEntry.lastAccessed && 
             currentEnrollment.updatedAt && 
             progressEntry.lastAccessed > currentEnrollment.updatedAt)
          ) {
            await db
              .update(enrollments)
              .set({
                progress: Math.max(progressValue, currentProgress),
                updatedAt: progressEntry.lastAccessed || currentEnrollment.updatedAt,
              })
              .where(eq(enrollments.id, currentEnrollment.id));
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (error: any) {
        const errorMsg = `Student ${progressEntry.studentId}, course ${progressEntry.courseId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Error processing:`, errorMsg);
      }
    }

    const summary = {
      total: allStudentProgress.length,
      created,
      updated,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Return first 10 errors
    };

    console.log('\n📈 Migration Summary:', summary);
    console.log('\n✅ Migration complete!');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      summary,
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Migration failed',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}





