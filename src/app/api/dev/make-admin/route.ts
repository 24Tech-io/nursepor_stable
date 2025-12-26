import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// DEV ONLY - Make any user an admin
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const db = getDatabase();

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Update to admin
    await db
      .update(users)
      .set({ role: 'admin', isActive: true })
      .where(eq(users.email, email.toLowerCase()));

    return NextResponse.json({
      success: true,
      message: `User ${email} is now an admin!`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin',
      },
    });
  } catch (error: any) {
    console.error('Error making admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

