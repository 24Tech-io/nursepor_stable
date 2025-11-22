import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET - Fetch all students with their stats
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

    // Fetch all students
    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        faceIdEnrolled: users.faceIdEnrolled,
        fingerprintEnrolled: users.fingerprintEnrolled,
        joinedDate: users.joinedDate,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.role, 'student'));

    // For each student, get enrolled courses count
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const enrolledCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(studentProgress)
          .where(eq(studentProgress.studentId, student.id));

        return {
          ...student,
          enrolledCourses: Number(enrolledCount[0]?.count || 0),
        };
      })
    );

    return NextResponse.json({ students: studentsWithStats });
  } catch (error: any) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch students', error: error.message },
      { status: 500 }
    );
  }
}

