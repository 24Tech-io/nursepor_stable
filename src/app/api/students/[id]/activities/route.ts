import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Student activity logs feature - table not yet implemented
// Return empty activities gracefully until migration is run
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);
    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    const db = getDatabase();

    // Verify student exists
    const student = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Return empty activities - feature not yet implemented
    console.log(`ℹ️ Student activities requested for student ${studentId} but table not yet created`);
    
    return NextResponse.json({
      activities: [],
      total: 0,
      student: {
        id: student[0].id,
        name: student[0].name,
        email: student[0].email,
      },
    });
  } catch (error: any) {
    console.error('Get student activities error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch student activities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

