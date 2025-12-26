import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/admin/activity-log';

// PATCH - Toggle student active/inactive status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            securityLogger.warn('Unauthorized access attempt', {
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                path: `/api/students/${params.id}/toggle-active`,
                userId: decoded?.id?.toString()
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
                updatedAt: new Date()
            })
            .where(eq(users.id, studentId));

        securityLogger.info('Student status toggled', {
            adminId: decoded.id,
            studentId,
            newStatus,
            previousStatus: student[0].isActive
        });

        return NextResponse.json({
            message: `Student ${newStatus ? 'activated' : 'deactivated'} successfully`,
            isActive: newStatus
        });
    } catch (error) {
        logger.error('Toggle active error:', error);
        securityLogger.info('Toggle active failed', { error: String(error) });
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);
    const db = getDatabase();

    // Get current student
    const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);

    if (student.length === 0) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Toggle active status
    const newStatus = !student[0].isActive;
    await db.update(users).set({ isActive: newStatus }).where(eq(users.id, studentId));

    console.log(`✅ Student ${studentId} active status changed to: ${newStatus}`);

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
      isActive: newStatus,
    });
  } catch (error: any) {
    console.error('Toggle student active error:', error);
    return NextResponse.json(
      { message: 'Failed to update student status', error: error.message },
      { status: 500 }
    );
  }
}
