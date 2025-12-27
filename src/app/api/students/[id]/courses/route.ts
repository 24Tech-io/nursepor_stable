import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';
import { securityLogger } from '@/lib/logger';

// POST - Enroll student in a course
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      if (!auth.isAuthenticated) return auth.response;
      securityLogger.warn('Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: `/api/students/${params.id}/courses`,
        userId: auth.user?.id?.toString()
      });
      return auth.response;
    }
    const { user: decoded } = auth;

    const studentId = parseInt(params.id);
    const { courseId } = await request.json();

    if (isNaN(studentId) || !courseId) {
      return NextResponse.json({ message: 'Invalid student ID or course ID' }, { status: 400 });
    }

    const db = getDatabase();

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

// DELETE - Unenroll student from a course
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      if (!auth.isAuthenticated) return auth.response;
      securityLogger.warn('Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: `/api/students/${params.id}/courses`,
        userId: auth.user?.id?.toString()
      });
      return auth.response;
    }
    const { user: decoded } = auth;

    const studentId = parseInt(params.id);
    const { courseId } = await request.json();

    if (isNaN(studentId) || !courseId) {
      return NextResponse.json({ message: 'Invalid student ID or course ID' }, { status: 400 });
    }

    const db = getDatabase();

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
