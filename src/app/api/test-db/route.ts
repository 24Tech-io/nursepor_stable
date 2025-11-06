import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL is not set in environment variables',
        message: 'Please create a .env.local file with your Neon DB connection string',
      }, { status: 500 });
    }

    // Test 2: Try to query the database
    try {
      // Simple query to test connection using raw SQL
      const neonSql = neon(process.env.DATABASE_URL);
      await neonSql`SELECT 1 as test`;
    } catch (dbError: any) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: dbError.message,
        details: {
          code: dbError.code,
          hint: 'Please check your DATABASE_URL connection string',
        },
      }, { status: 500 });
    }

    // Test 3: Check if users table exists
    try {
      const neonSql = neon(process.env.DATABASE_URL);
      const result = await neonSql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        ) as exists;
      `;
      
      const tableExists = result[0]?.exists;
      
      if (!tableExists) {
        return NextResponse.json({
          success: false,
          error: 'Database tables not found',
          message: 'The users table does not exist. You need to run migrations.',
          solution: 'Run: npx drizzle-kit migrate',
        }, { status: 500 });
      }
    } catch (tableError: any) {
      return NextResponse.json({
        success: false,
        error: 'Error checking tables',
        message: tableError.message,
      }, { status: 500 });
    }

    // Test 4: Try to count users (if table exists)
    try {
      const userCount = await db.select().from(users).limit(1);
      return NextResponse.json({
        success: true,
        message: 'Database connection successful!',
        details: {
          databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
          tablesExist: true,
          canQuery: true,
        },
      });
    } catch (queryError: any) {
      return NextResponse.json({
        success: false,
        error: 'Error querying users table',
        message: queryError.message,
        hint: 'Table might exist but schema might be different. Try running migrations again.',
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

