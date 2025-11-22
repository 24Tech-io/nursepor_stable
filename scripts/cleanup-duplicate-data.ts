#!/usr/bin/env tsx
/**
 * Script to clean up duplicate test data
 * Run with: npx tsx scripts/cleanup-duplicate-data.ts
 */

import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    process.exit(1);
}

// Dynamic import to ensure env var is set before db init
const { db } = await import('../src/lib/db');
const { courses, modules, chapters, enrollments, quizAttempts, videoProgress } = await import('../src/lib/db/schema');
import { sql } from 'drizzle-orm';

async function cleanupDuplicateData() {
    console.log('🧹 Starting duplicate data cleanup...\n');

    try {
        // Get all courses
        const allCourses = await db.select().from(courses);
        console.log(`📊 Found ${allCourses.length} total courses`);

        // Keep only the first 3 unique courses (by title)
        const uniqueTitles = new Set<string>();
        const coursesToKeep: number[] = [];
        const coursesToDelete: number[] = [];

        for (const course of allCourses) {
            if (!uniqueTitles.has(course.title) && coursesToKeep.length < 3) {
                uniqueTitles.add(course.title);
                coursesToKeep.push(course.id);
            } else {
                coursesToDelete.push(course.id);
            }
        }

        console.log(`✅ Keeping ${coursesToKeep.length} courses`);
        console.log(`🗑️  Deleting ${coursesToDelete.length} duplicate courses\n`);

        if (coursesToDelete.length > 0) {
            // Delete related data first (due to foreign key constraints)
            console.log('Deleting related enrollments...');
            await db.delete(enrollments).where(sql`course_id IN (${sql.join(coursesToDelete.map(id => sql`${id}`), sql`, `)})`);

            console.log('Deleting related modules and chapters...');
            await db.delete(modules).where(sql`course_id IN (${sql.join(coursesToDelete.map(id => sql`${id}`), sql`, `)})`);

            console.log('Deleting duplicate courses...');
            await db.delete(courses).where(sql`id IN (${sql.join(coursesToDelete.map(id => sql`${id}`), sql`, `)})`);

            console.log(`✅ Deleted ${coursesToDelete.length} duplicate courses\n`);
        }

        // Get final count
        const finalCourses = await db.select().from(courses);
        console.log(`✨ Cleanup complete! Final course count: ${finalCourses.length}`);

        // List remaining courses
        console.log('\n📚 Remaining courses:');
        for (const course of finalCourses) {
            console.log(`  - ${course.title} (ID: ${course.id})`);
        }

    } catch (error) {
        console.error('❌ Error cleaning up data:', error);
        throw error;
    }
}

// Run the script
cleanupDuplicateData()
    .then(() => {
        console.log('\n✅ Cleanup completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
    });
