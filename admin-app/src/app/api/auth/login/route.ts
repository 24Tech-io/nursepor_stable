import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role } = body;
    
    // Ensure we're authenticating as admin
    if (role && role !== 'admin') {
      return NextResponse.json(
        { message: 'This endpoint is for admin login only' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if database is available
    try {
      console.log('🔐 Attempting admin login for:', email);
      const user = await authenticateAdmin(email, password);

      if (!user) {
        console.log('❌ Admin login failed: Invalid credentials for', email);
        return NextResponse.json(
          { message: 'Invalid email or password. Please check your credentials.' },
          { status: 401 }
        );
      }

      console.log('✅ Admin login successful:', { id: user.id, email: user.email, role: user.role });

      const token = generateToken(user);

      const response = NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectUrl: '/dashboard', // Add this line
      });

      response.cookies.set('adminToken', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        // Explicitly set domain to undefined for localhost
        domain: undefined,
      });

      console.log('🍪 Cookie set in response. Token length:', token.length);
      console.log('📤 Sending login response with cookie');

      return response;
    } catch (dbError: any) {
      console.error('❌ Database error during login:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        stack: dbError.stack,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      });
      return NextResponse.json(
        { 
          message: 'Database connection error', 
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          hint: 'Please check DATABASE_URL in admin-app/.env.local'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
