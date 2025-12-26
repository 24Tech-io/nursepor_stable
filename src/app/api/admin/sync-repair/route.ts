import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { syncRepairSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentProgress, enrollments, accessRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const repaired = {
      progressCreated: 0,
      enrollmentsCreated: 0,
      requestsDeleted: 0,
      errors: [] as string[],
    };

    // Get inconsistencies from request body
    const bodyValidation = await extractAndValidate(request, syncRepairSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { progressOnly, enrollmentsOnly, pendingEnrolled } = bodyValidation.data;

    // 1. Create missing enrollments records
    if (progressOnly && progressOnly.length > 0) {
      for (const item of progressOnly) {
        try {
          await db.insert(enrollments).values({
            userId: item.studentId,
            courseId: item.courseId,
            status: 'active',
            progress: 0,
          });
          repaired.enrollmentsCreated++;
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore duplicate key errors
            repaired.errors.push(`Failed to create enrollment for student ${item.studentId}, course ${item.courseId}: ${error.message}`);
          }
        }
      }
    }

    // 2. Create missing studentProgress records
    if (enrollmentsOnly && enrollmentsOnly.length > 0) {
      for (const item of enrollmentsOnly) {
        try {
          await db.insert(studentProgress).values({
            studentId: item.userId,
            courseId: item.courseId,
            completedChapters: '[]',
            watchedVideos: '[]',
            quizAttempts: '[]',
            totalProgress: 0,
          });
          repaired.progressCreated++;
        } catch (error: any) {
          if (error.code !== '23505') {
            repaired.errors.push(`Failed to create progress for student ${item.userId}, course ${item.courseId}: ${error.message}`);
          }
        }
      }
    }

    // 3. Delete pending requests for enrolled courses
    if (pendingEnrolled && pendingEnrolled.length > 0) {
      for (const item of pendingEnrolled) {
        try {
          await db.delete(accessRequests)
            .where(eq(accessRequests.id, item.requestId));
          repaired.requestsDeleted++;
        } catch (error: any) {
          repaired.errors.push(`Failed to delete request ${item.requestId}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      message: 'Repair completed',
      repaired,
    });
  } catch (error) {
    logger.error('Repair error:', error);
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}


