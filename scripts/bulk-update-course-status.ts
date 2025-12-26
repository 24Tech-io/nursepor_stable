/**
 * Bulk Update Course Status Script
 * 
 * CLI script to bulk update course statuses
 * 
 * Usage:
 *   npm run script:bulk-update-status -- --status=published --fromStatus=draft
 *   npm run script:bulk-update-status -- --status=published --courseIds=1,2,3
 *   npm run script:bulk-update-status -- --status=published --all
 */

import { getDatabase } from '../src/lib/db';
import { courses } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

interface ScriptOptions {
  status?: string;
  fromStatus?: string;
  courseIds?: number[];
  excludeIds?: number[];
  excludeTitles?: string[];
  all?: boolean;
  preview?: boolean;
}

async function bulkUpdateCourseStatus(options: ScriptOptions) {
  try {
    const db = getDatabase();

    const {
      status = 'published',
      fromStatus,
      courseIds,
      excludeIds = [],
      excludeTitles = ['Nurse Pro', 'Q-Bank'],
      all = false,
      preview = false,
    } = options;

    // Validate status
    const validStatuses = ['published', 'draft', 'archived'];
    if (!validStatuses.includes(status)) {
      console.error(`❌ Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      process.exit(1);
    }

    console.log(`\n🔍 Finding courses to update to '${status}'...\n`);

    // Build query
    let coursesToUpdate: any[] = [];

    if (courseIds && courseIds.length > 0) {
      // Specific course IDs
      const allCourses = await db
        .select()
        .from(courses)
        .where(inArray(courses.id, courseIds));
      
      coursesToUpdate = allCourses.filter((c: any) => {
        if (excludeIds.includes(c.id)) return false;
        if (excludeTitles.includes(c.title)) return false;
        if (c.status === status) return false; // Already has target status
        return true;
      });
    } else if (fromStatus) {
      // Filter by current status
      const allCourses = await db
        .select()
        .from(courses)
        .where(eq(courses.status, fromStatus));
      
      coursesToUpdate = allCourses.filter((c: any) => {
        if (excludeIds.includes(c.id)) return false;
        if (excludeTitles.includes(c.title)) return false;
        return true;
      });
    } else if (all) {
      // All courses
      const allCourses = await db.select().from(courses);
      coursesToUpdate = allCourses.filter((c: any) => {
        if (excludeIds.includes(c.id)) return false;
        if (excludeTitles.includes(c.title)) return false;
        if (c.status === status) return false; // Already has target status
        return true;
      });
    } else {
      console.error('❌ Please specify: --fromStatus=<status>, --courseIds=<ids>, or --all');
      process.exit(1);
    }

    if (coursesToUpdate.length === 0) {
      console.log('✅ No courses to update.');
      return;
    }

    // Preview mode
    if (preview) {
      console.log(`📋 Preview: ${coursesToUpdate.length} course(s) would be updated:\n`);
      coursesToUpdate.forEach((course: any) => {
        console.log(`  - ${course.title} (ID: ${course.id})`);
        console.log(`    Current: ${course.status} → Target: ${status}\n`);
      });
      return;
    }

    // Confirm update
    console.log(`📋 Found ${coursesToUpdate.length} course(s) to update:\n`);
    coursesToUpdate.forEach((course: any) => {
      console.log(`  - ${course.title} (ID: ${course.id})`);
      console.log(`    ${course.status} → ${status}\n`);
    });

    // Perform bulk update
    const courseIdsToUpdate = coursesToUpdate.map((c: any) => c.id);
    
    const updatedCourses = await db
      .update(courses)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(inArray(courses.id, courseIdsToUpdate))
      .returning();

    console.log(`\n✅ Successfully updated ${updatedCourses.length} course(s) to '${status}':\n`);
    updatedCourses.forEach((course: any) => {
      console.log(`  ✅ ${course.title} (ID: ${course.id})`);
    });

    // If publishing, notify students
    if (status === 'published') {
      try {
        const { notifyNewCoursePublished } = await import('../src/lib/sync-service');
        console.log('\n📢 Sending notifications to students...\n');
        for (const course of updatedCourses) {
          await notifyNewCoursePublished(course.id, course.title);
          console.log(`  📢 Notified about: ${course.title}`);
        }
      } catch (notifyError) {
        console.warn('⚠️  Failed to send notifications:', notifyError);
      }
    }

    console.log('\n✅ Done!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    logger.error('Bulk update script error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--status=')) {
      options.status = arg.split('=')[1];
    } else if (arg.startsWith('--fromStatus=')) {
      options.fromStatus = arg.split('=')[1];
    } else if (arg.startsWith('--courseIds=')) {
      const ids = arg.split('=')[1].split(',').map(id => parseInt(id.trim()));
      options.courseIds = ids.filter(id => !isNaN(id));
    } else if (arg.startsWith('--excludeIds=')) {
      const ids = arg.split('=')[1].split(',').map(id => parseInt(id.trim()));
      options.excludeIds = ids.filter(id => !isNaN(id));
    } else if (arg.startsWith('--excludeTitles=')) {
      options.excludeTitles = arg.split('=')[1].split(',').map(t => t.trim());
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--preview') {
      options.preview = true;
    }
  }

  return options;
}

// Run script
if (require.main === module) {
  const options = parseArgs();
  bulkUpdateCourseStatus(options)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { bulkUpdateCourseStatus };

