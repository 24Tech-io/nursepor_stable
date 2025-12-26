import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { modules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update module
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const moduleId = parseInt(params.moduleId);
    const updates = await request.json();

    const db = getDatabase();

    await db
      .update(modules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, moduleId));

    console.log(`✅ Module ${moduleId} updated`);

    return NextResponse.json({ message: 'Module updated successfully' });
  } catch (error: any) {
    console.error('Update module error:', error);
    return NextResponse.json(
      { message: 'Failed to update module', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete module
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const moduleId = parseInt(params.moduleId);
    const db = getDatabase();

    await db.delete(modules).where(eq(modules.id, moduleId));

    console.log(`✅ Module ${moduleId} deleted`);

    return NextResponse.json({ message: 'Module deleted successfully' });
  } catch (error: any) {
    console.error('Delete module error:', error);
    return NextResponse.json(
      { message: 'Failed to delete module', error: error.message },
      { status: 500 }
    );
  }
}
