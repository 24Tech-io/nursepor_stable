import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { quizzes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET - Fetch all quizzes (for admin to assign questions)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    const allQuizzes = await db
      .select()
      .from(quizzes)
      .orderBy(desc(quizzes.createdAt))
      .limit(100); // Limit to recent 100 quizzes

    return NextResponse.json({ quizzes: allQuizzes });
  } catch (error: any) {
    console.error('Get all quizzes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quizzes', error: error.message },
      { status: 500 }
    );
  }
}




