import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc, count, or, like, asc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Simplified GET endpoint without advanced features to ensure it works
export async function GET(request: NextRequest) {
    try {
        // Check for admin_token first (new auth system), then fallback to token for backward compatibility
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('adminToken')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            logger.error('[GET /api/students] No token found');
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            logger.error('[GET /api/students] Token verification failed');
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        
        if (decoded.role !== 'admin') {
            logger.error('[GET /api/students] Role check failed. Role:', decoded.role);
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        // Simple query - just return all users with student role
        const db = await getDatabaseWithRetry();
        const allStudents = await db
            .select()
            .from(users)
            .where(eq(users.role, 'student'))
            .orderBy(desc(users.createdAt))
            .limit(100);

        return NextResponse.json({
            students: allStudents,
            total: allStudents.length
        });
    } catch (error: any) {
        logger.error('Get students error:', error);
        return NextResponse.json({
            message: 'Failed to fetch students',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
