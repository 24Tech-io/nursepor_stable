/**
 * Database Cleanup Script - Remove Mock Courses
 * 
 * This script removes all mock/test courses from the database.
 * Run this to prepare the system for production launch.
 * 
 * Usage: npx tsx scripts/cleanup-mock-data.ts
 */

import { db } from '../src/lib/db';
import { courses, modules, chapters, questionBanks, qbankQuestions } from '../src/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';

async function cleanupMockData() {
    console.log('🧹 Starting mock data cleanup...\n');

    try {
        // 1. Find and delete courses with test/mock indicators
        console.log('Step 1: Identifying mock courses...');
        const mockCourses = await db.select().from(courses).where(
            or(
                like(courses.title, '%Test%'),
                like(courses.title, '%Mock%'),
                like(courses.title, '%Demo%'),
                like(courses.title, '%Sample%'),
                like(courses.description, '%test%'),
                like(courses.description, '%mock%'),
                eq(courses.instructor, 'Test Instructor'),
                eq(courses.instructor, 'Demo User')
            )
        );

        if (mockCourses.length === 0) {
            console.log('✅ No mock courses found!\n');
        } else {
            console.log(`Found ${mockCourses.length} mock courses:`);
            mockCourses.forEach(course => {
                console.log(`  - [${course.id}] ${course.title} by ${course.instructor}`);
            });

            // Delete mock courses (cascading will handle modules, chapters, etc.)
            for (const course of mockCourses) {
                await db.delete(courses).where(eq(courses.id, course.id));
            }
            console.log(`✅ Deleted ${mockCourses.length} mock courses\n`);
        }

        // 2. Clean up orphaned modules (if any)
        console.log('Step 2: Checking for orphaned modules...');
        const allModules = await db.select().from(modules);
        let orphanedCount = 0;

        for (const module of allModules) {
            const parentCourse = await db.select().from(courses).where(eq(courses.id, module.courseId));
            if (parentCourse.length === 0) {
                await db.delete(modules).where(eq(modules.id, module.id));
                orphanedCount++;
            }
        }
        console.log(`✅ Cleaned up ${orphanedCount} orphaned modules\n`);

        // 3. Clean up orphaned chapters
        console.log('Step 3: Checking for orphaned chapters...');
        const allChapters = await db.select().from(chapters);
        let orphanedChaptersCount = 0;

        for (const chapter of allChapters) {
            const parentModule = await db.select().from(modules).where(eq(modules.id, chapter.moduleId));
            if (parentModule.length === 0) {
                await db.delete(chapters).where(eq(chapters.id, chapter.id));
                orphanedChaptersCount++;
            }
        }
        console.log(`✅ Cleaned up ${orphanedChaptersCount} orphaned chapters\n`);

        // 4. Summary of remaining courses
        console.log('Step 4: Summary of remaining courses...');
        const remainingCourses = await db.select().from(courses);

        if (remainingCourses.length === 0) {
            console.log('⚠️  WARNING: No courses remaining in database!');
            console.log('   Admins will need to create new courses.\n');
        } else {
            console.log(`✅ ${remainingCourses.length} courses remaining:`);
            remainingCourses.forEach(course => {
                console.log(`  - [${course.id}] ${course.title} by ${course.instructor} (Status: ${course.status})`);
            });
            console.log('');
        }

        console.log('✅ Cleanup complete!\n');
        console.log('Summary:');
        console.log(`  - Mock courses removed: ${mockCourses.length}`);
        console.log(`  - Orphaned modules cleaned: ${orphanedCount}`);
        console.log(`  - Orphaned chapters cleaned: ${orphanedChaptersCount}`);
        console.log(`  - Courses remaining: ${remainingCourses.length}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupMockData()
    .then(() => {
        console.log('\n✅ All done! Database is ready for production.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
