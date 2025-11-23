import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';

/**
 * Diagnostic API to check database connection from student app
 * Helps verify that student app can connect to the same database as admin
 */
export async function GET(request: NextRequest) {
  try {
    const checks: any = {
      databaseUrl: {
        exists: !!process.env.DATABASE_URL,
        length: process.env.DATABASE_URL?.length || 0,
        preview: process.env.DATABASE_URL
          ? `${process.env.DATABASE_URL.substring(0, 20)}...`
          : 'Not set',
      },
      connection: {
        status: 'unknown',
        error: null,
      },
      tables: {
        courses: {
          exists: false,
          count: 0,
          error: null,
        },
      },
    };

    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        checks,
        error: 'DATABASE_URL is not set in environment variables',
        hint: 'Please check your .env.local file',
      });
    }

    // Try to connect to database
    let db;
    try {
      db = getDatabase();
      checks.connection.status = 'connected';
    } catch (dbError: any) {
      checks.connection.status = 'failed';
      checks.connection.error = dbError.message;
      return NextResponse.json({
        success: false,
        checks,
        error: 'Failed to connect to database',
        message: dbError.message,
      });
    }

    // Try to query courses table
    try {
      const courseCount = await db
        .select({ count: courses.id })
        .from(courses)
        .limit(1);

      const allCourses = await db
        .select({
          id: courses.id,
          title: courses.title,
          status: courses.status,
        })
        .from(courses)
        .limit(10);

      checks.tables.courses.exists = true;
      checks.tables.courses.count = allCourses.length;
      checks.tables.courses.sample = allCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
      }));
    } catch (tableError: any) {
      checks.tables.courses.error = tableError.message;
    }

    return NextResponse.json({
      success: true,
      checks,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ DB Connection diagnostic error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


