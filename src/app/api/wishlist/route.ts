/**
 * Wishlist API
 * Manage user's wishlist/favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { wishlist } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const items = await db.query.wishlist.findMany({
      where: eq(wishlist.userId, user.id),
      with: {
        course: true,
      },
    });

    return NextResponse.json({ wishlist: items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

// POST - Add to wishlist
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { courseId } = await request.json();

    // Check if already in wishlist
    const existing = await db.query.wishlist.findFirst({
      where: and(
        eq(wishlist.userId, user.id),
        eq(wishlist.courseId, courseId)
      ),
    });

    if (existing) {
      return NextResponse.json({ message: 'Already in wishlist' });
    }

    await db.insert(wishlist).values({
      userId: user.id,
      courseId,
    });

    return NextResponse.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

// DELETE - Remove from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { courseId } = await request.json();

    await db.delete(wishlist).where(
      and(
        eq(wishlist.userId, user.id),
        eq(wishlist.courseId, courseId)
      )
    );

    return NextResponse.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}

