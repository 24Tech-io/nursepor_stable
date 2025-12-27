import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check database connection
    let dbStatus = 'healthy';
    let dbResponseTime = 0;

    try {
      const dbStart = Date.now();
      const db = await getDatabaseWithRetry();
      await db.execute(sql`SELECT 1`);
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      logger.error('Database health check failed:', error);
    }

    // Check overall health
    const isHealthy = dbStatus === 'healthy';
    const responseTime = Date.now() - startTime;

    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      database: {
        connected: isHealthy,
        status: dbStatus,
        responseTime: `${dbResponseTime}ms`
      }
    };

    return NextResponse.json(healthData, { status: isHealthy ? 200 : 503 });

  } catch (error: any) {
    logger.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    const db = await getDatabaseWithRetry();
    await db.execute(sql`SELECT 1`);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
