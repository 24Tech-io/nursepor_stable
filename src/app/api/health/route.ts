import { logger } from '@/lib/logger';
/**
 * Health Check Endpoint
 * Used for monitoring and load balancer health checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { sql } from 'drizzle-orm';

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
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        server: {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
        },
        memory: {
          status: 'healthy',
          usage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          },
        },
      },
    };
    
    // Return 200 if healthy, 503 if degraded
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });
  } catch (error: any) {
    logger.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error',
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

