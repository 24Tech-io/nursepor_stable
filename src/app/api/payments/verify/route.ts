import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { payments, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getDatabase();

    // Check payment status
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeSessionId, sessionId))
      .limit(1);

    if (!payment.length) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const paymentData = payment[0];

    // If payment is still pending, check with Stripe
    if (paymentData.status === 'pending' && stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          // Update payment status
          await db
            .update(payments)
            .set({
              status: 'completed',
              stripePaymentIntentId: session.payment_intent as string,
              transactionId: session.id,
              updatedAt: new Date(),
            })
            .where(eq(payments.stripeSessionId, sessionId));

          // Ensure student is enrolled
          const existingProgress = await db
            .select()
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, paymentData.userId),
                eq(studentProgress.courseId, paymentData.courseId)
              )
            )
            .limit(1);

          if (existingProgress.length === 0) {
            await db.insert(studentProgress).values({
              studentId: paymentData.userId,
              courseId: paymentData.courseId,
              completedChapters: '[]',
              watchedVideos: '[]',
              quizAttempts: '[]',
              totalProgress: 0,
            });
          }

          return NextResponse.json({
            success: true,
            payment: {
              id: paymentData.id,
              status: 'completed',
              amount: paymentData.amount,
              courseId: paymentData.courseId,
            },
          });
        }
      } catch (stripeError) {
        console.error('Error checking Stripe session:', stripeError);
      }
    }

    return NextResponse.json({
      success: paymentData.status === 'completed',
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        amount: paymentData.amount,
        courseId: paymentData.courseId,
      },
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify payment',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

