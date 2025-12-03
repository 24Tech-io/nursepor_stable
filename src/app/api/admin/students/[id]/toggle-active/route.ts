import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Toggle student active/inactive status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
