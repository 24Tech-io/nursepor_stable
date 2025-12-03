import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studentProgress } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const progress = await db.query.studentProgress.findMany({
      where: eq(studentProgress.studentId, user.id),
    });

    // Aggregate all completed chapters from all course progress records
    const completedChapters = progress.flatMap((p: any) => {
      try {
        return JSON.parse(p.completedChapters || '[]');
      } catch (e) {
        return [];
      }
    });

    return NextResponse.json({ completedChapters });
  } catch (error) {
    console.error('Get student progress error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
