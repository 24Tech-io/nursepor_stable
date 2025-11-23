import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { studentProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        let user;
        try {
            user = verifyToken(token);
            if (!user || !user.id) {
                return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
            }
        } catch (error: any) {
            console.error('Token verification error:', error);
            return NextResponse.json(
                { message: 'Token verification failed', error: error.message },
                { status: 401 }
            );
        }

        let db;
        try {
            db = getDatabase();
        } catch (dbError: any) {
            console.error('❌ Database connection error:', dbError);
            return NextResponse.json(
                { 
                    message: 'Database connection error',
                    error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                },
                { status: 500 }
            );
        }
        
        // Get all progress records for this student
        let progress;
        try {
            progress = await db
                .select({
                    completedChapters: studentProgress.completedChapters,
                })
                .from(studentProgress)
                .where(eq(studentProgress.studentId, user.id));
        } catch (error: any) {
            console.error('❌ Error fetching progress:', error);
            return NextResponse.json(
                { 
                    message: 'Error fetching progress',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                },
                { status: 500 }
            );
        }

        console.log(`📊 Found ${progress.length} progress records for student ${user.id}`);

        // Aggregate all completed chapters from all course progress records
        const completedChapters = progress.flatMap((p: any) => {
            try {
                const chapters = JSON.parse(p.completedChapters || '[]');
                // Ensure all IDs are numbers
                return chapters.map((id: any) => Number(id));
            } catch (e) {
                console.error('Error parsing completedChapters:', e);
                return [];
            }
        });

        // Remove duplicates
        const uniqueChapters = Array.from(new Set(completedChapters));
        
        console.log(`✅ Returning ${uniqueChapters.length} completed chapters:`, uniqueChapters);

        return NextResponse.json({ completedChapters: uniqueChapters });
    } catch (error: any) {
        console.error('❌ Get student progress error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
        });
        return NextResponse.json(
            { 
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}
