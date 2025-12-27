import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';
import { securityLogger } from '@/lib/logger';

// PATCH - Toggle student active/inactive status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      if (!auth.isAuthenticated) return auth.response;
      securityLogger.warn('Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: `/api/students/${params.id}/toggle-active`,
        userId: auth.user?.id?.toString()
      });
      return auth.response;
    }
    const { user: decoded } = auth;

    const studentId = parseInt(params.id);

    if (isNaN(studentId)) {
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    const db = getDatabase();

    // Get current student status
    const student = await db
      .select({ isActive: users.isActive, name: users.name })
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
        updatedAt: new Date()
      })
      .where(eq(users.id, studentId));

    securityLogger.info('Student status toggled', {
      adminId: decoded.id,
      studentId,
      newStatus,
      previousStatus: student[0].isActive
    });

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name || 'Admin',
      action: newStatus ? 'activated' : 'deactivated',
      entityType: 'student',
      entityId: studentId,
      entityName: student[0].name,
    });

    return NextResponse.json({
      message: `Student ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus
    });
  } catch (error: any) {
    logger.error('Toggle active error:', error);
    securityLogger.info('Toggle active failed', { error: String(error) });
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
