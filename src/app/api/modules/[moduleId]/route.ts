import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { modules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import { logger, securityLogger } from '@/lib/logger';

/**
 * PUT /api/modules/[moduleId]
 * Update a module's details (e.g., title)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('adminToken')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const moduleId = parseInt(params.moduleId);
        if (isNaN(moduleId)) {
            return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
        }

        const { title } = await request.json();

        if (!title || !title.trim()) {
            return NextResponse.json({ message: 'Title is required' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        const result = await db.update(modules)
            .set({ title: title.trim() })
            .where(eq(modules.id, moduleId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ message: 'Module not found' }, { status: 404 });
        }

        securityLogger.info('Module Updated', { moduleId, adminId: decoded.id });

        return NextResponse.json({
            message: 'Module updated successfully',
            module: result[0]
        });

    } catch (error: any) {
        logger.error('Update module error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error?.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/modules/[moduleId]
 * Delete a module and all its content
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        // Verify admin authentication
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('adminToken')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const moduleId = parseInt(params.moduleId);

        if (isNaN(moduleId) || moduleId <= 0) {
            return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
        }

        // Get database instance
        const db = await getDatabaseWithRetry();

        // Delete module (CASCADE will delete chapters automatically)
        const result = await db
            .delete(modules)
            .where(eq(modules.id, moduleId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ message: 'Module not found' }, { status: 404 });
        }

        securityLogger.info('Module Deleted', { moduleId, adminId: decoded.id });

        return NextResponse.json({
            message: 'Module deleted successfully',
            module: result[0]
        });

    } catch (error: any) {
        logger.error('Delete module error:', error);
        return NextResponse.json(
            {
                message: 'Internal server error',
                error: error?.message || 'Unknown error',
                details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        );
    }
}
