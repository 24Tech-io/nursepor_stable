import { NextResponse } from 'next/server';
import { getDatabase, getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
    };

    // Try to connect to database with retry
    let db;
    try {
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      return NextResponse.json({
          success: false,
          error: 'Database connection failed',
        errorMessage: dbError.message,
        environment: envCheck,
      }, { status: 503 }); // Service Unavailable
    }

    // Try to query database
    let userCount = 0;
    let adminCount = 0;
    try {
      const allUsers = await db.select().from(users).limit(10);
      userCount = allUsers.length;
      adminCount = allUsers.filter(u => u.role === 'admin').length;
    } catch (queryError: any) {
      return NextResponse.json({
            success: false,
        error: 'Database query failed',
        errorMessage: queryError.message,
        environment: envCheck,
      }, { status: 500 });
    }

      return NextResponse.json({
        success: true,
      message: 'Database connection successful',
      environment: envCheck,
      database: {
        connected: true,
        userCount,
        adminCount,
        },
      });
  } catch (error: any) {
    return NextResponse.json({
        success: false,
        error: 'Unexpected error',
      errorMessage: error.message,
    }, { status: 500 });
  }
}
