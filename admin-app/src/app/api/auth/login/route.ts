import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { message: 'Invalid request body. Please check your input.' },
        { status: 400 }
      );
    }

    const { email, password, role } = body;

    // Ensure we're authenticating as admin
    if (role && role !== 'admin') {
      return NextResponse.json(
        { message: 'This endpoint is for admin login only' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
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

      console.log('✅ Admin login successful:', {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Generate token with error handling
      let token;
      try {
        token = generateToken(user);
        console.log('✅ Token generated successfully');
      } catch (tokenError: any) {
        console.error('❌ Error generating token:', tokenError);
        return NextResponse.json(
          {
            message: 'Failed to generate authentication token',
            error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined,
            hint: 'Please check JWT_SECRET configuration',
          },
          { status: 500 }
        );
      }

      // Create response
      let response;
      try {
        response = NextResponse.json({
          message: 'Login successful',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          redirectUrl: '/dashboard',
        });

        // Set cookie with error handling
        try {
          response.cookies.set('adminToken', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            domain: undefined, // Explicitly set domain to undefined for localhost
          });
          console.log('🍪 Cookie set in response. Token length:', token.length);
        } catch (cookieError: any) {
          console.error('❌ Error setting cookie:', cookieError);
          // Don't fail the login if cookie setting fails, but log it
        }

        console.log('📤 Sending login response with cookie');
        return response;
      } catch (responseError: any) {
        console.error('❌ Error creating response:', responseError);
        return NextResponse.json(
          {
            message: 'Failed to create login response',
            error: process.env.NODE_ENV === 'development' ? responseError.message : undefined,
          },
          { status: 500 }
        );
      }
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
          hint: 'Please check DATABASE_URL in admin-app/.env.local',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Admin login error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    });

    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    if (error.message?.includes('DATABASE_URL') || error.message?.includes('Database')) {
      errorMessage = 'Database connection error. Please check your DATABASE_URL configuration.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        hint: process.env.NODE_ENV === 'development' ? 'Check server logs for details' : undefined,
      },
      { status: 500 }
    );
  }
}
