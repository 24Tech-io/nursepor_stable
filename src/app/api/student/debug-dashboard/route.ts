import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Determine base URL for server-side fetches
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Fetch all the data the dashboard needs
    const [coursesRes, enrolledRes, statsRes, requestsRes] = await Promise.all([
      fetch(`${baseUrl}/api/student/courses`, {
        headers: { Cookie: `studentToken=${token}` },
      }),
      fetch(`${baseUrl}/api/student/enrolled-courses`, {
        headers: { Cookie: `studentToken=${token}` },
      }),
      fetch(`${baseUrl}/api/student/stats`, {
        headers: { Cookie: `studentToken=${token}` },
      }),
      fetch(`${baseUrl}/api/student/requests`, {
        headers: { Cookie: `studentToken=${token}` },
      }),
    ]);

    const [courses, enrolled, stats, requests] = await Promise.all([
      coursesRes.json(),
      enrolledRes.json(),
      statsRes.json(),
      requestsRes.json(),
    ]);

    const enrolledCourseIds = enrolled.enrolledCourses?.map((ec: any) => String(ec.courseId)) || [];
    const pendingRequestIds =
      requests.requests
        ?.filter((r: any) => r.status === 'pending')
        .map((r: any) => String(r.courseId)) || [];

    return NextResponse.json(
      {
        userId: decoded.id,
        totalCourses: courses.courses?.length || 0,
        enrolledIds: enrolledCourseIds,
        pendingRequestIds: pendingRequestIds,
        courses: courses.courses?.map((c: any) => ({
          id: String(c.id),
          title: c.title,
          status: c.status,
          isEnrolled: c.isEnrolled,
          isInEnrolledList: enrolledCourseIds.includes(String(c.id)),
          hasPendingRequest: pendingRequestIds.includes(String(c.id)),
          shouldShowAsEnrolled:
            enrolledCourseIds.includes(String(c.id)) &&
            !pendingRequestIds.includes(String(c.id)) &&
            (c.status === 'published' || c.status === 'active'),
        })),
        stats: stats.stats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
