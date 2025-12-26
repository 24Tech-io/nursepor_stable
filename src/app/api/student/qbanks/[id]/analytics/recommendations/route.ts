import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments, qbankStudyRecommendations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateStudyRecommendations } from '@/lib/qbank-analytics';

// GET - Study recommendations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const studentId = decoded.id;
    const qbankId = parseInt(params.id);
    const db = await getDatabaseWithRetry();

    // Get enrollment
    const enrollment = await db
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, studentId),
          eq(qbankEnrollments.qbankId, qbankId)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this Q-Bank' }, { status: 403 });
    }

    // Get existing recommendations
    const existing = await db
      .select()
      .from(qbankStudyRecommendations)
      .where(
        and(
          eq(qbankStudyRecommendations.enrollmentId, enrollment[0].id),
          eq(qbankStudyRecommendations.isDismissed, false)
        )
      )
      .orderBy(qbankStudyRecommendations.priority, qbankStudyRecommendations.generatedAt);

    // Generate new recommendations if needed (or if existing are old)
    let recommendations = existing;
    if (existing.length === 0 || existing[0].generatedAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      const newRecs = await generateStudyRecommendations(enrollment[0].id, studentId, qbankId);

      // Insert new recommendations
      if (newRecs.length > 0) {
        await db.insert(qbankStudyRecommendations).values(
          newRecs.map(rec => ({
            ...rec,
            enrollmentId: enrollment[0].id,
            studentId,
          }))
        );
      }

      // Get all recommendations again
      recommendations = await db
        .select()
        .from(qbankStudyRecommendations)
        .where(
          and(
            eq(qbankStudyRecommendations.enrollmentId, enrollment[0].id),
            eq(qbankStudyRecommendations.isDismissed, false)
          )
        )
        .orderBy(qbankStudyRecommendations.priority, qbankStudyRecommendations.generatedAt);
    }

    return NextResponse.json({
      recommendations: recommendations.map(r => ({
        id: r.id,
        recommendationType: r.recommendationType,
        priority: r.priority,
        title: r.title,
        description: r.description,
        actionItems: r.actionItems ? JSON.parse(r.actionItems) : [],
        categoryId: r.categoryId,
        subject: r.subject,
        generatedAt: r.generatedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Get recommendations error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recommendations', error: error.message },
      { status: 500 }
    );
  }
}

