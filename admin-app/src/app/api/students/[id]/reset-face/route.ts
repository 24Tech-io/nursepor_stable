import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Reset student's Face ID enrollment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const studentId = parseInt(params.id);
    const db = getDatabase();

    // Reset face ID enrollment
    await db
      .update(users)
      .set({
        faceIdEnrolled: false,
        faceTemplate: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, studentId));

    console.log(`✅ Face ID reset for student ${studentId}`);

    return NextResponse.json({
      message: 'Face ID enrollment reset successfully. Student must re-enroll.',
    });
  } catch (error: any) {
    console.error('Reset face ID error:', error);
    return NextResponse.json(
      { message: 'Failed to reset Face ID', error: error.message },
      { status: 500 }
    );
  }
}

