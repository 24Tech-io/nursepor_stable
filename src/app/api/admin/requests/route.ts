import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Get all access requests with student and course info
    const allRequests = await db
      .select({
        id: accessRequests.id,
        studentId: accessRequests.studentId,
        courseId: accessRequests.courseId,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
        reviewedBy: accessRequests.reviewedBy,
        studentName: users.name,
        studentEmail: users.email,
        courseTitle: courses.title,
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.studentId, users.id))
      .leftJoin(courses, eq(accessRequests.courseId, courses.id))
      .orderBy(desc(accessRequests.requestedAt));

    return NextResponse.json({
      requests: allRequests.map((req: any) => ({
        id: req.id.toString(),
        studentId: req.studentId.toString(),
        courseId: req.courseId.toString(),
        studentName: req.studentName || 'Unknown',
        studentEmail: req.studentEmail || 'Unknown',
        courseTitle: req.courseTitle || 'Unknown Course',
        reason: req.reason || '',
        status: req.status,
        requestedAt: req.requestedAt?.toISOString(),
        reviewedAt: req.reviewedAt?.toISOString(),
        reviewedBy: req.reviewedBy?.toString(),
      })),
    });
  } catch (error: any) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get requests',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

