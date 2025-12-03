import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    let decoded = verifyToken(token);

    // If token is expired, try to extract user ID from payload
    if (!decoded || !decoded.id) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.id) {
          // Use the ID from the expired token to get user from database
          decoded = { id: payload.id } as any;
        } else {
          return NextResponse.json(
            { message: 'Invalid token' },
            { status: 401 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { message: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    // Get database instance (will throw if not available)
    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded?.id || 0))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Log user data for debugging
    const phoneValue = user[0].phone;
    const phoneString = phoneValue && String(phoneValue).trim() ? String(phoneValue).trim() : null;
    
    console.log('🔍 /api/auth/me - Token decoded ID:', decoded?.id);
    console.log('🔍 /api/auth/me - User found in database:', {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      phone: phoneValue,
      phoneType: typeof phoneValue,
      phoneIsNull: phoneValue === null,
      phoneIsUndefined: phoneValue === undefined,
      phoneIsEmptyString: phoneValue === '',
      phoneAfterProcessing: phoneString,
      role: user[0].role,
      bio: user[0].bio,
      profilePicture: user[0].profilePicture,
      joinedDate: user[0].joinedDate,
    });

    const userResponse = {
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      phone: phoneString, // Convert to string and trim, or null if empty
      bio: user[0].bio && String(user[0].bio).trim() ? String(user[0].bio).trim() : null,
      profilePicture: user[0].profilePicture || null,
      role: user[0].role,
      isActive: user[0].isActive,
      faceIdEnrolled: user[0].faceIdEnrolled || false,
      fingerprintEnrolled: user[0].fingerprintEnrolled || false,
      twoFactorEnabled: user[0].twoFactorEnabled || false,
      joinedDate: user[0].joinedDate ? new Date(user[0].joinedDate).toISOString() : null,
      lastLogin: user[0].lastLogin ? new Date(user[0].lastLogin).toISOString() : null,
    };

    console.log('✅ /api/auth/me - Returning user data:', userResponse);

    return NextResponse.json({
      user: userResponse,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    // Handle database connection errors
    if (error?.message?.includes('DATABASE_URL') || 
        error?.message?.includes('Database is not available') ||
        error?.message?.includes('connection') ||
        error?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { 
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Handle table not found errors (migrations not run)
    if (error?.message?.includes('does not exist') || 
        error?.code === '42P01') {
      return NextResponse.json(
        { 
          message: 'Database tables not found. Please run migrations: npx drizzle-kit migrate',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Failed to get user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

