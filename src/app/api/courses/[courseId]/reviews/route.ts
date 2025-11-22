/**
 * Course Reviews API
 * Create and manage course reviews and ratings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseReviews, courses } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get all reviews for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = parseInt(params.courseId);

    const reviews = await db.query.courseReviews.findMany({
      where: and(
        eq(courseReviews.courseId, courseId),
        eq(courseReviews.isPublished, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
      orderBy: [desc(courseReviews.createdAt)],
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      reviews,
      summary: {
        totalReviews: reviews.length,
        averageRating: avgRating.toFixed(1),
        ratingDistribution: {
          5: reviews.filter((r: { rating: number }) => r.rating === 5).length,
          4: reviews.filter((r: { rating: number }) => r.rating === 4).length,
          3: reviews.filter((r: { rating: number }) => r.rating === 3).length,
          2: reviews.filter((r: { rating: number }) => r.rating === 2).length,
          1: reviews.filter((r: { rating: number }) => r.rating === 1).length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Create a review
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const courseId = parseInt(params.courseId);
    const body = await request.json();
    const { rating, review } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed
    const existing = await db.query.courseReviews.findFirst({
      where: and(
        eq(courseReviews.userId, user.id),
        eq(courseReviews.courseId, courseId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this course' },
        { status: 400 }
      );
    }

    // Create review
    const [newReview] = await db.insert(courseReviews).values({
      courseId,
      userId: user.id,
      rating,
      review: review || '',
    }).returning();

    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

