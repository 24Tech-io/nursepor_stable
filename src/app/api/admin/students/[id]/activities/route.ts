import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { studentActivityLogs, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);
    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify student exists
    const student = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Fetch activities
    const activities = await db
      .select()
      .from(studentActivityLogs)
      .where(eq(studentActivityLogs.studentId, studentId))
      .orderBy(desc(studentActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Parse metadata
    const activitiesWithMetadata = activities.map((activity: any) => {
      let metadata = null;
      try {
        metadata = activity.metadata ? JSON.parse(activity.metadata) : null;
      } catch (e) {
        logger.warn('Failed to parse activity metadata:', e);
      }

      return {
        id: activity.id,
        activityType: activity.activityType,
        title: activity.title,
        description: activity.description,
        metadata,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        createdAt: activity.createdAt?.toISOString(),
      };
    });

    // Get total count
    const totalCount = await db
      .select({ count: studentActivityLogs.id })
      .from(studentActivityLogs)
      .where(eq(studentActivityLogs.studentId, studentId));

    return NextResponse.json({
      activities: activitiesWithMetadata,
      total: totalCount.length,
      student: {
        id: student[0].id,
        name: student[0].name,
        email: student[0].email,
      },
    });
  } catch (error: any) {
    logger.error('Get student activities error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch student activities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




