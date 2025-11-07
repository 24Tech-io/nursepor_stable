import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { testEmailConnection, sendTestEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Test SMTP connection
    const connectionTest = await testEmailConnection();
    
    return NextResponse.json({
      connection: connectionTest,
    });
  } catch (error: any) {
    console.error('Test email connection error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to test email connection',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email address is required' },
        { status: 400 }
      );
    }

    // Send test email
    const result = await sendTestEmail(email);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Send test email error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to send test email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

