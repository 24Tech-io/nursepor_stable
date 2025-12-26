
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
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

        const studentId = parseInt(params.id);
        if (isNaN(studentId)) {
            return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        // Fetch student details
        const [student] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                isActive: users.isActive,
                joinedDate: users.joinedDate,
                lastLogin: users.lastLogin,
                bio: users.bio,
                profilePicture: users.profilePicture
            })
            .from(users)
            .where(eq(users.id, studentId));

        if (!student) {
            return NextResponse.json({ message: 'Student not found' }, { status: 404 });
        }

        return NextResponse.json({
            student: {
                ...student,
                joinedDate: student.joinedDate ? new Date(student.joinedDate).toISOString() : null,
                lastLogin: student.lastLogin ? new Date(student.lastLogin).toISOString() : null,
            }
        });

    } catch (error: any) {
        logger.error('Get student details error:', error);
        return NextResponse.json({
            message: 'Failed to fetch student details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
