import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getUserAccounts, authenticateUser, createSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const currentUser = authResult.user;

    // Get database instance
    const db = getDatabase();

    const { role, password } = await request.json();

    if (!role) {
      return NextResponse.json({ message: 'Role is required' }, { status: 400 });
    }

    if (!['student', 'admin'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role. Must be student or admin' },
        { status: 400 }
      );
    }

    // Get all accounts for this email
    const accounts = await getUserAccounts(currentUser.email);

    // Find the account with the requested role
    const targetAccount = accounts.find((acc) => acc.role === role);

    if (!targetAccount) {
      return NextResponse.json(
        { message: `You don't have a ${role} account with this email. Please register one first.` },
        { status: 404 }
      );
    }

    // If switching to a different account, verify password
    if (targetAccount.id !== currentUser.id) {
      if (!password) {
        return NextResponse.json(
          { message: 'Password required to switch to a different account' },
          { status: 400 }
        );
      }

      // Verify password for the target account
      const isValid = await authenticateUser(currentUser.email, password, role);
      if (!isValid) {
        return NextResponse.json({ message: 'Invalid password for this account' }, { status: 401 });
      }
    }

    // Create new session for the target account
    const sessionToken = await createSession(targetAccount.id, undefined, targetAccount);

    const response = NextResponse.json({
      message: 'Role switched successfully',
      user: {
        id: targetAccount.id,
        name: targetAccount.name,
        email: targetAccount.email,
        role: targetAccount.role,
      },
    });

    // Set new cookie
    response.cookies.set('token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Switch role error:', error);
    return NextResponse.json(
      {
        message: 'Failed to switch role',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
