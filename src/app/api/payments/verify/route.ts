import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

