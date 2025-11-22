import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc, count, or, like, asc } from 'drizzle-orm';

// Simplified GET endpoint without advanced features to ensure it works
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        // Simple query - just return all users with student role
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
        console.error('Get students error:', error);
        return NextResponse.json({
            message: 'Failed to fetch students',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
