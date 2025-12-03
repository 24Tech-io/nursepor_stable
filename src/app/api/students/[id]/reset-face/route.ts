import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      securityLogger.warn('Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: `/api/students/${params.id}/reset-face`,
        userId: decoded?.id?.toString(),
      });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);

    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    // Get student info
    const student = await db
      .select({
        id: users.id,
        name: users.name,
        faceIdEnrolled: users.faceIdEnrolled,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (!student[0].faceIdEnrolled) {
      return NextResponse.json(
        {
          message: 'Student does not have Face ID enrolled',
        },
        { status: 400 }
      );
    }

    // Reset Face ID
    await db
      .update(users)
      .set({
        faceIdEnrolled: false,
        faceTemplate: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, studentId));

    securityLogger.info('Face ID reset by admin', {
      adminId: decoded.id,
      studentId,
      studentName: student[0].name,
    });

    return NextResponse.json({
      message: 'Face ID reset successfully. Student will need to re-enroll.',
      studentId,
      faceIdEnrolled: false,
    });
  } catch (error) {
    console.error('Reset Face ID error:', error);
    securityLogger.info('Face ID reset failed', { error: String(error) });
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
