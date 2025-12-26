import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { accessRequests } from '@/lib/db/schema';

// GET - Test endpoint to verify request system is working
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Not authenticated',
          checks: {
            token: false,
            database: null,
            requests: null,
          },
        },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Admin access required',
          checks: {
            token: false,
            database: null,
            requests: null,
          },
        },
        { status: 403 }
      );
    }

    // Test database connection
    let db;
    let dbStatus = false;
    let requestCount = 0;

    try {
      db = await getDatabaseWithRetry();
      dbStatus = true;

      // Try to count requests
      const requests = await db.select().from(accessRequests).limit(1);
      requestCount = requests.length;
    } catch (dbError: any) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: dbError.message,
          checks: {
            token: true,
            database: false,
            requests: null,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'All systems operational',
      checks: {
        token: true,
        database: dbStatus,
        requests: requestCount >= 0,
      },
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Test failed',
        error: error.message,
        checks: {
          token: null,
          database: null,
          requests: null,
        },
      },
      { status: 500 }
    );
  }
}
