import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const db = getDatabase();

    // Try a simple query using Drizzle
    const result = await db.execute(sql`SELECT 1 as test`);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      testQuery: result.rows?.[0] || 'query executed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
