import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { studentProgress, chapters, modules, courses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get continue learning recommendations
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
        }

        // Get student's enrolled courses with progress
        const enrolledCourses = await db
            .select({
                courseId: studentProgress.courseId,
                courseTitle: courses.title,
                courseThumbnail: courses.thumbnail,
                totalProgress: studentProgress.totalProgress,
                completedChapters: studentProgress.completedChapters,
                lastAccessed: studentProgress.lastAccessed
            })
            .from(studentProgress)
            .innerJoin(courses, eq(studentProgress.courseId, courses.id))
            .where(eq(studentProgress.studentId, decoded.id))
            .orderBy(desc(studentProgress.lastAccessed));

        const recommendations: any[] = [];

        for (const course of enrolledCourses) {
            // Parse completed chapters
            const completed = JSON.parse(course.completedChapters || '[]');

            // Find the next incomplete chapter
            const allChapters = await db
                .select({
                    id: chapters.id,
                    title: chapters.title,
                    type: chapters.type,
                    moduleId: chapters.moduleId,
                    moduleTitle: modules.title,
                    order: chapters.order
                })
                .from(chapters)
                .innerJoin(modules, eq(chapters.moduleId, modules.id))
                .where(eq(modules.courseId, course.courseId))
                .orderBy(modules.order, chapters.order);

            // Find first incomplete chapter
            const nextChapter = allChapters.find(ch => !completed.includes(ch.id));

            if (nextChapter) {
                recommendations.push({
                    courseId: course.courseId,
                    courseTitle: course.courseTitle,
                    courseThumbnail: course.courseThumbnail,
                    progress: course.totalProgress,
                    nextChapter: {
                        id: nextChapter.id,
                        title: nextChapter.title,
                        type: nextChapter.type,
                        moduleTitle: nextChapter.moduleTitle
                    },
                    lastAccessed: course.lastAccessed
                });
            }
        }

        return NextResponse.json({
            recommendations: recommendations.slice(0, 5) // Top 5 recommendations
        });
    } catch (error) {
        console.error('Get recommendations error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
