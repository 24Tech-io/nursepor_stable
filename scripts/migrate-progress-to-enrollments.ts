/**
 * Migration Script: Migrate Progress Data from studentProgress to enrollments
 * 
 * This script migrates all progress data from the studentProgress table to the enrollments table,
 * making enrollments the single source of truth for enrollment and progress data.
 * 
 * Run with: npx tsx scripts/migrate-progress-to-enrollments.ts
 */

import { getDatabase } from '../src/lib/db';
import { studentProgress, enrollments } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function migrateProgressToEnrollments() {
  console.log('🚀 Starting migration from studentProgress to enrollments...');
  const db = getDatabase();

  try {
    // Get all entries from studentProgress
    const allStudentProgress = await db.select().from(studentProgress);
    console.log(`📊 Found ${allStudentProgress.length} entries in studentProgress.`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

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
          console.log(`✅ Created enrollment for student ${progressEntry.studentId}, course ${progressEntry.courseId}`);
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
            console.log(`🔄 Updated enrollment for student ${progressEntry.studentId}, course ${progressEntry.courseId}`);
          } else {
            skipped++;
            console.log(`⏭️  Skipped enrollment for student ${progressEntry.studentId}, course ${progressEntry.courseId} (no update needed)`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing student ${progressEntry.studentId}, course ${progressEntry.courseId}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total processed: ${allStudentProgress.length}`);
    console.log('\n✅ Migration complete!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateProgressToEnrollments()
  .then(() => {
    console.log('✨ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
