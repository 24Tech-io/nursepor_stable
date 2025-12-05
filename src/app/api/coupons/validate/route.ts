/**
 * Coupon Validation API
 * Validate and apply discount coupons
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { code, courseId, amount } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
    }

    // Find coupon
    const coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)),
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check expiry
    const now = new Date();
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (new Date(coupon.validFrom) > now) {
      return NextResponse.json({ error: 'Coupon not yet valid' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    // Check minimum purchase amount
    if (coupon.minPurchaseAmount && amount < coupon.minPurchaseAmount) {
      return NextResponse.json(
        { error: `Minimum purchase amount is ₹${coupon.minPurchaseAmount}` },
        { status: 400 }
      );
    }

    // Check applicable courses
    if (coupon.applicableCourses) {
      const applicableCourses = JSON.parse(coupon.applicableCourses);
      if (!applicableCourses.includes(courseId)) {
        return NextResponse.json(
          { error: 'Coupon not applicable to this course' },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (amount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      originalAmount: amount,
      discountAmount,
      finalAmount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
