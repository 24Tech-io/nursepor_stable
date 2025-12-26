import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// POST - Create Stripe checkout session for textbook purchase
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { message: 'Payment processing is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const textbookId = parseInt(params.id);
    if (isNaN(textbookId)) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Check if already purchased
    const existingPurchase = await db
      .select()
      .from(textbookPurchases)
      .where(
        and(
          eq(textbookPurchases.studentId, decoded.id),
          eq(textbookPurchases.textbookId, textbookId),
          eq(textbookPurchases.status, 'completed')
        )
      )
      .limit(1);

    if (existingPurchase.length > 0) {
      return NextResponse.json({
        message: 'Already purchased',
        purchase: existingPurchase[0],
        alreadyPurchased: true
      });
    }

    // Get textbook
    const [textbook] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!textbook) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    if (textbook.status !== 'published') {
      return NextResponse.json({ message: 'Textbook is not available for purchase' }, { status: 400 });
    }

    if (textbook.price <= 0) {
      return NextResponse.json({ message: 'This textbook is free. Please contact admin for access.' }, { status: 400 });
    }

    // Create payment record first
    const [payment] = await db
      .insert(payments)
      .values({
        userId: decoded.id,
        textbookId: textbookId,
        itemType: 'textbook',
        amount: textbook.price,
        currency: textbook.currency,
        status: 'pending',
        stripeSessionId: null, // Will be updated after session creation
      })
      .returning();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: textbook.currency.toLowerCase(),
            product_data: {
              name: textbook.title,
              description: textbook.description || undefined,
              images: textbook.thumbnail ? [`${process.env.NEXT_PUBLIC_APP_URL}${textbook.thumbnail}`] : undefined,
            },
            unit_amount: Math.round(textbook.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/student/textbooks/${textbookId}?purchase=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/student/textbooks/${textbookId}?purchase=cancelled`,
      metadata: {
        studentId: decoded.id.toString(),
        textbookId: textbookId.toString(),
        itemType: 'textbook',
        paymentId: payment.id.toString(),
      },
    });

    // Update payment with session ID
    await db
      .update(payments)
      .set({
        stripeSessionId: session.id,
      })
      .where(eq(payments.id, payment.id));

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error: any) {
    logger.error('Purchase textbook error:', error);
    return NextResponse.json(
      { message: 'Failed to create purchase', error: error.message },
      { status: 500 }
    );
  }
}

