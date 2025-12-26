import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch all the data the dashboard needs
    const [coursesRes, enrolledRes, statsRes, requestsRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/student/courses`, {
        headers: { Cookie: `token=${token}` }
      }),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/student/enrolled-courses`, {
        headers: { Cookie: `token=${token}` }
      }),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/student/stats`, {
        headers: { Cookie: `token=${token}` }
      }),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/student/requests`, {
        headers: { Cookie: `token=${token}` }
      }),
    ]);

    const [courses, enrolled, stats, requests] = await Promise.all([
      coursesRes.json(),
      enrolledRes.json(),
      statsRes.json(),
      requestsRes.json(),
    ]);

    const enrolledCourseIds = enrolled.enrolledCourses?.map((ec: any) => String(ec.courseId)) || [];
    const pendingRequestIds = requests.requests?.filter((r: any) => r.status === 'pending')
      .map((r: any) => String(r.courseId)) || [];

    return NextResponse.json({
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
        shouldShowAsEnrolled: enrolledCourseIds.includes(String(c.id)) &&
          !pendingRequestIds.includes(String(c.id)) &&
          (c.status === 'published' || c.status === 'active'),
      })),
      stats: stats.stats,
    }, { status: 200 });
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
