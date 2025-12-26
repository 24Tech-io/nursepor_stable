import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateModuleSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { modules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update module
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const moduleId = parseInt(params.moduleId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateModuleSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const updates = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    await db
      .update(modules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, moduleId));

    logger.info(`✅ Module ${moduleId} updated`);

    return NextResponse.json({ message: 'Module updated successfully' });
  } catch (error: any) {
    logger.error('Update module error:', error);
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
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const moduleId = parseInt(params.moduleId);
    const db = await getDatabaseWithRetry();

    await db.delete(modules).where(eq(modules.id, moduleId));

    logger.info(`✅ Module ${moduleId} deleted`);

    return NextResponse.json({ message: 'Module deleted successfully' });
  } catch (error: any) {
    logger.error('Delete module error:', error);
    return NextResponse.json(
      { message: 'Failed to delete module', error: error.message },
      { status: 500 }
    );
  }
}
