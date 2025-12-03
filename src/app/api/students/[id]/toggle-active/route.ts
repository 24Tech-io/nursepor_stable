import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      securityLogger.warn('Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: `/api/students/${params.id}/toggle-active`,
        userId: decoded?.id?.toString(),
      });
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);

    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    // Get current student status
    const student = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    const newStatus = !student[0].isActive;

    // Toggle active status
    await db
      .update(users)
      .set({
        isActive: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, studentId));

    securityLogger.info('Student status toggled', {
      adminId: decoded.id,
      studentId,
      newStatus,
      previousStatus: student[0].isActive,
    });

    return NextResponse.json({
      message: `Student ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus,
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    securityLogger.info('Toggle active failed', { error: String(error) });
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
