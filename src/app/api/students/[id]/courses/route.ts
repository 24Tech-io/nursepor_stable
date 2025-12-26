import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, courses, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

// POST - Manually assign course to student
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            securityLogger.warn('Unauthorized access attempt', {
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                path: `/api/students/${params.id}/courses`,
                userId: decoded?.id?.toString()
            });
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const studentId = parseInt(params.id);
        const { courseId } = await request.json();

        if (isNaN(studentId) || !courseId) {
            return NextResponse.json({ message: 'Invalid student ID or course ID' }, { status: 400 });
        }

        // Verify student exists
        const student = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, studentId))
            .limit(1);

        if (student.length === 0) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        // Verify course exists
        const course = await db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(eq(courses.id, parseInt(courseId)))
            .limit(1);

        if (course.length === 0) {
            return NextResponse.json({ message: 'Course not found' }, { status: 404 });
        }

        // Check if already enrolled
        const existing = await db
            .select()
            .from(studentProgress)
            .where(
                and(
                    eq(studentProgress.studentId, studentId),
                    eq(studentProgress.courseId, parseInt(courseId))
                )
            );

        if (existing.length > 0) {
            return NextResponse.json({ message: 'Student already enrolled in this course' }, { status: 400 });
        }

        // Create enrollment
        await db.insert(studentProgress).values({
            studentId,
            courseId: parseInt(courseId),
            totalProgress: 0,
            completedChapters: '[]',
            watchedVideos: '[]',
            quizAttempts: '[]'
        });

        securityLogger.info('Course manually assigned', {
            adminId: decoded.id,
            studentId,
            studentName: student[0].name,
            courseId,
            courseTitle: course[0].title
        });

        return NextResponse.json({
            message: 'Course assigned successfully',
            enrollment: {
                studentId,
                courseId: parseInt(courseId)
            }
        });
    } catch (error) {
        logger.error('Assign course error:', error);
        securityLogger.info('Course assignment failed', { error: String(error) });
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}

// DELETE - Revoke course access from student
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            securityLogger.warn('Unauthorized access attempt', {
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                path: `/api/students/${params.id}/courses`,
                userId: decoded?.id?.toString()
            });
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const studentId = parseInt(params.id);
        const { courseId } = await request.json();

        if (isNaN(studentId) || !courseId) {
            return NextResponse.json({ message: 'Invalid student ID or course ID' }, { status: 400 });
        }

        // Delete enrollment
        const result = await db
            .delete(studentProgress)
            .where(
                and(
                    eq(studentProgress.studentId, studentId),
                    eq(studentProgress.courseId, parseInt(courseId))
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ message: 'Enrollment not found' }, { status: 404 });
        }

        securityLogger.info('Course access revoked', {
            adminId: decoded.id,
            studentId,
            courseId
        });

        return NextResponse.json({
            message: 'Course access revoked successfully'
        });
    } catch (error) {
        logger.error('Revoke course error:', error);
        securityLogger.info('Course revocation failed', { error: String(error) });
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }
}
