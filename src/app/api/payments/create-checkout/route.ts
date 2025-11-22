import { NextRequest, NextResponse } from 'next/server';
import { stripe, convertToStripeAmount } from '@/lib/stripe';
import { getDatabase } from '@/lib/db';
import { courses, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { sanitizeString, validateBodySize } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to .env.local' },
      { status: 500 }
    );
  }

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult.user;

  // Get database instance
  const db = getDatabase();

  try {
    // Validate request body size
    const body = await request.text();
    if (!validateBodySize(body, 512)) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { courseId, userId } = data;

    // Validate inputs
    if (!courseId || !userId) {
      return NextResponse.json(
        { error: 'Course ID and User ID are required' },
        { status: 400 }
      );
    }

    // Ensure user can only create checkout for themselves
    if (parseInt(userId) !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Sanitize courseId
    const sanitizedCourseId = sanitizeString(String(courseId), 20);
    const courseIdNum = parseInt(sanitizedCourseId);
    if (isNaN(courseIdNum) || courseIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    // Get course details
    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseIdNum))
      .limit(1);

    if (!course.length) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const courseData = course[0];

    if (!courseData.pricing || courseData.pricing <= 0) {
      return NextResponse.json(
        { error: 'This course is free. No payment required.' },
        { status: 400 }
      );
    }

    // Check if user already purchased this course
    const existingPayment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, user.id),
          eq(payments.courseId, courseIdNum),
          eq(payments.status, 'completed')
        )
      )
      .limit(1);

    if (existingPayment.length > 0) {
      return NextResponse.json(
        { error: 'You have already purchased this course' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: courseData.title,
              description: courseData.description,
              images: courseData.thumbnail ? [courseData.thumbnail] : [],
            },
            unit_amount: convertToStripeAmount(courseData.pricing, 'INR'),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/student/courses?canceled=true`,
      metadata: {
        userId: user.id.toString(),
        courseId: courseIdNum.toString(),
      },
      customer_email: undefined, // Will be set from user data if available
    });

    // Create payment record in database
    await db.insert(payments).values({
      userId: user.id,
      courseId: courseIdNum,
      amount: courseData.pricing,
      currency: 'INR',
      status: 'pending',
      stripeSessionId: session.id,
      metadata: JSON.stringify({
        courseTitle: courseData.title,
      }),
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Payment checkout error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

