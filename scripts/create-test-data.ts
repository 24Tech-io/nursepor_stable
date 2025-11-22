#!/usr/bin/env tsx
/**
 * Script to create comprehensive test data for the LMS platform
 * Run with: npx tsx scripts/create-test-data.ts
 */

import { courses, modules, chapters, users, enrollments, quizAttempts, videoProgress } from '../src/lib/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    process.exit(1);
}

// Dynamic import to ensure env var is set before db init
const { db } = await import('../src/lib/db');

async function createTestData() {
    console.log('🚀 Starting test data creation...\n');

    try {
        // 1. Ensure admin and student users exist
        console.log('👤 Creating/verifying users...');

        const adminEmail = 'admin@lms.com';
        const studentEmail = 'student@lms.com';

        // Check if admin exists
        let admin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
        if (admin.length === 0) {
            const hashedPassword = await hash('Password123', 10);
            await db.insert(users).values({
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isActive: true,
            });
            admin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
            console.log('✅ Created admin user');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Check if student exists
        let student = await db.select().from(users).where(eq(users.email, studentEmail)).limit(1);
        if (student.length === 0) {
            const hashedPassword = await hash('Password123', 10);
            await db.insert(users).values({
                name: 'Test Student',
                email: studentEmail,
                password: hashedPassword,
                role: 'student',
                isActive: true,
            });
            student = await db.select().from(users).where(eq(users.email, studentEmail)).limit(1);
            console.log('✅ Created student user');
        } else {
            console.log('ℹ️  Student user already exists');
        }

        const studentId = student[0].id;
        console.log(`📝 Student ID: ${studentId}\n`);

        // 2. Create test courses
        console.log('📚 Creating test courses...');

        const courseData = [
            {
                title: 'NCLEX-RN Fundamentals',
                description: 'Complete fundamentals course for NCLEX-RN preparation with comprehensive practice questions and video lectures',
                instructor: 'Nurse Educator Team',
                pricing: 0,
                status: 'published' as const,
                category: 'Fundamentals',
            },
            {
                title: 'Medical-Surgical Nursing',
                description: 'Advanced medical-surgical nursing concepts with case studies and clinical scenarios',
                instructor: 'Clinical Nurse Specialist',
                pricing: 49.99,
                status: 'published' as const,
                category: 'Medical-Surgical',
            },
            {
                title: 'Pharmacology Essentials',
                description: 'Essential pharmacology for nursing students with drug classifications and mechanisms',
                instructor: 'Pharm.D Instructor',
                pricing: 0,
                status: 'published' as const,
                category: 'Pharmacology',
            },
        ];

        const createdCourses = [];
        for (const course of courseData) {
            const [newCourse] = await db.insert(courses).values(course).returning();
            createdCourses.push(newCourse);
            console.log(`✅ Created course: ${course.title} (ID: ${newCourse.id})`);
        }

        console.log('');

        // 3. Create modules and chapters for each course
        console.log('📖 Creating modules and chapters...');

        for (const course of createdCourses) {
            // Create 2 modules per course
            for (let modIndex = 1; modIndex <= 2; modIndex++) {
                const [module] = await db.insert(modules).values({
                    courseId: course.id,
                    title: `Module ${modIndex}: ${modIndex === 1 ? 'Introduction' : 'Advanced Concepts'}`,
                    description: `Learning module ${modIndex} for ${course.title}`,
                    order: modIndex - 1,
                    duration: 0,
                }).returning();

                console.log(`  ✅ Created module: ${module.title}`);

                // Create 3 chapters per module
                const chapterTypes = ['video', 'text', 'quiz'] as const;
                for (let chapIndex = 1; chapIndex <= 3; chapIndex++) {
                    const chapterType = chapterTypes[chapIndex - 1];
                    await db.insert(chapters).values({
                        moduleId: module.id,
                        title: `Chapter ${chapIndex}: ${chapterType === 'video' ? 'Video Lecture' : chapterType === 'text' ? 'Reading Material' : 'Quiz Assessment'}`,
                        type: chapterType,
                        content: chapterType === 'text' ? 'Comprehensive learning content for this chapter' : null,
                        videoUrl: chapterType === 'video' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : null,
                        duration: chapterType === 'video' ? 600 : null, // 10 minutes
                        order: chapIndex - 1,
                    });
                }
                console.log(`    Added 3 chapters (video, text, quiz)`);
            }
        }

        console.log('');

        // 4. Enroll student in courses
        console.log('🎓 Enrolling student in courses...');

        // Enroll in first course (free)
        await db.insert(enrollments).values({
            userId: studentId,
            courseId: createdCourses[0].id,
            status: 'active',
            progress: 0,
        });
        console.log(`✅ Enrolled in: ${createdCourses[0].title}`);

        // Enroll in third course (free)
        await db.insert(enrollments).values({
            userId: studentId,
            courseId: createdCourses[2].id,
            status: 'active',
            progress: 0,
        });
        console.log(`✅ Enrolled in: ${createdCourses[2].title}`);

        console.log('');

        // 5. Create some video progress
        console.log('📹 Creating video progress data...');

        const firstCourseModules = await db.select().from(modules)
            .where(eq(modules.courseId, createdCourses[0].id));

        if (firstCourseModules.length > 0) {
            const firstModuleChapters = await db.select().from(chapters)
                .where(eq(chapters.moduleId, firstCourseModules[0].id));

            const videoChapter = firstModuleChapters.find((ch: any) => ch.type === 'video');
            if (videoChapter) {
                await db.insert(videoProgress).values({
                    userId: studentId,
                    chapterId: videoChapter.id,
                    progress: 45,
                    lastPosition: 270, // 4:30 out of 10:00
                    duration: 600, // 10 minutes
                    completed: false,
                });
                console.log(`✅ Created progress for video chapter (45% watched)`);
            }
        }

        console.log('');

        // 6. Create quiz attempt
        console.log('📝 Creating quiz attempt data...');

        if (firstCourseModules.length > 0) {
            const firstModuleChapters = await db.select().from(chapters)
                .where(eq(chapters.moduleId, firstCourseModules[0].id));

            const quizChapter = firstModuleChapters.find((ch: any) => ch.type === 'quiz');
            if (quizChapter) {
                await db.insert(quizAttempts).values({
                    userId: studentId,
                    chapterId: quizChapter.id,
                    score: 85,
                    totalQuestions: 10,
                    correctAnswers: 8,
                    answers: JSON.stringify({ q1: 'A', q2: 'B', q3: 'C' }),
                    timeTaken: 450, // 7.5 minutes
                    passed: true,
                });
                console.log(`✅ Created quiz attempt (85% score, 8/10 correct)`);
            }
        }

        console.log('\n✨ Test data creation completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Courses: ${createdCourses.length}`);
        console.log(`   - Modules: ${createdCourses.length * 2}`);
        console.log(`   - Chapters: ${createdCourses.length * 2 * 3}`);
        console.log(`   - Enrollments: 2`);
        console.log(`   - Video Progress: 1`);
        console.log(`   - Quiz Attempts: 1`);
        console.log('\n🎯 You can now test the platform with populated data!');

    } catch (error) {
        console.error('❌ Error creating test data:', error);
        throw error;
    }
}

// Run the script
createTestData()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
