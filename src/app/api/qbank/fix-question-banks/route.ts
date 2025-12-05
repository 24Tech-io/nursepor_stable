import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { questionBanks, courseQuestionAssignments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST - Auto-create questionBanks for all courses with question assignments
export async function POST(request: NextRequest) {
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

    // Get all unique course IDs with question assignments
    const assignments = await db.select().from(courseQuestionAssignments);
    const courseIds = [...new Set(assignments.map((a: any) => a.courseId))];

    console.log(`🔧 Found ${courseIds.length} courses with question assignments`);

    // Get existing questionBanks
    const existingQBanks = await db.select().from(questionBanks);
    const existingCourseIds = existingQBanks.map((q: any) => q.courseId);

    const created = [];
    const skipped = [];

    // Create questionBanks for courses that don't have one
    for (const courseId of courseIds) {
      if (!existingCourseIds.includes(courseId)) {
        const questionCount = assignments.filter((a: any) => a.courseId === courseId).length;
        
        const [newQBank] = await db
          .insert(questionBanks)
          .values({
            courseId,
            name: `Course ${courseId} Q-Bank`,
            description: `Practice questions for course ${courseId} (${questionCount} questions)`,
            isActive: true,
          })
          .returning();

        created.push({
          id: newQBank.id,
          courseId,
          questionCount,
        });

        console.log(`✅ Created questionBank ID ${newQBank.id} for course ${courseId}`);
      } else {
        skipped.push(courseId);
        console.log(`⏭️ QuestionBank already exists for course ${courseId}`);
      }
    }

    return NextResponse.json({
      message: 'Question banks created successfully',
      created: created.length,
      skipped: skipped.length,
      details: {
        created,
        skipped,
      },
    });
  } catch (error: any) {
    console.error('Fix question banks error:', error);
    return NextResponse.json(
      { message: 'Failed to fix question banks', error: error.message },
      { status: 500 }
    );
  }
}

