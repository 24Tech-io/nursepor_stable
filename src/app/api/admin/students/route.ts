import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    // Get all students from database
    const allStudents = await db
      .select()
      .from(users)
      .where(eq(users.role, 'student'))
      .orderBy(desc(users.joinedDate));

    return NextResponse.json({
      students: allStudents.map((student: any) => ({
        id: student.id.toString(),
        name: student.name,
        email: student.email,
        phone: student.phone || null,
        bio: student.bio || null,
        role: student.role,
        isActive: student.isActive,
        faceIdEnrolled: student.faceIdEnrolled,
        fingerprintEnrolled: student.fingerprintEnrolled,
        joinedDate: student.joinedDate?.toISOString(),
        lastLogin: student.lastLogin?.toISOString(),
        profilePicture: student.profilePicture || null,
      })),
    });
  } catch (error: any) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

