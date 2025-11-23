import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch all access requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    console.log('🔍 Fetching all access requests...');

    // First, get ALL requests (including orphaned ones for debugging)
    const allRequestsRaw = await db
      .select()
      .from(accessRequests)
      .orderBy(desc(accessRequests.requestedAt));

    console.log(`📊 Found ${allRequestsRaw.length} total requests in database`);

    // Fetch all requests with student and course details
    // Return ALL requests (pending, approved, rejected) - let frontend filter
    const requests = await db
      .select({
        id: accessRequests.id,
        studentId: accessRequests.studentId,
        studentName: users.name,
        studentEmail: users.email,
        courseId: accessRequests.courseId,
        courseTitle: courses.title,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
      })
      .from(accessRequests)
      .leftJoin(users, eq(accessRequests.studentId, users.id))
      .leftJoin(courses, eq(accessRequests.courseId, courses.id))
      .orderBy(desc(accessRequests.requestedAt));

    console.log(`✅ Returning ${requests.length} requests with details`);
    console.log('📋 Request statuses:', requests.map((r: any) => ({
      id: r.id,
      student: r.studentName || 'DELETED',
      course: r.courseTitle || 'DELETED',
      status: r.status
    })));

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}

