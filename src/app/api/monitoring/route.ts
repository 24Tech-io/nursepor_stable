import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { performanceLogger } from '@/lib/logger';

// Prevent static generation - this route requires database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SystemMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: string;
      latency: string;
    };
    api: {
      status: string;
      latency: string;
    };
    memory: {
      status: string;
      usage: {
        rss: string;
        heapUsed: string;
        heapTotal: string;
        external: string;
      };
      percentage: number;
    };
    cpu: {
      status: string;
      usage: number;
    };
  };
  version: string;
  environment: string;
  nodeVersion: string;
}

// GET /api/monitoring - Get system metrics
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Database health check
    let dbStatus = 'disconnected';
    let dbLatency = -1;

    if (isDatabaseAvailable()) {
      try {
        const dbStart = Date.now();
        await db.execute('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'slow' : 'degraded';
      } catch (error) {
        dbStatus = 'error';
        logger.error('Database health check failed:', error);
      }
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memPercentage = (usedMemory / totalMemory) * 100;

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) % 100;

    const totalLatency = Date.now() - startTime;

    const metrics: SystemMetrics = {
      status: dbStatus === 'healthy' && memPercentage < 90 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        database: {
          status: dbStatus,
          latency: dbLatency >= 0 ? `${dbLatency}ms` : 'N/A',
        },
        api: {
          status: 'operational',
          latency: `${totalLatency}ms`,
        },
        memory: {
          status: memPercentage < 80 ? 'healthy' : memPercentage < 90 ? 'warning' : 'critical',
          usage: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          },
          percentage: Math.round(memPercentage),
        },
        cpu: {
          status: cpuPercent < 70 ? 'healthy' : cpuPercent < 90 ? 'warning' : 'critical',
          usage: Math.round(cpuPercent),
        },
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    };

    // Log performance metrics
    performanceLogger.info('System metrics collected', {
      dbLatency,
      apiLatency: totalLatency,
      memoryUsage: memPercentage,
      cpuUsage: cpuPercent,
    });

    const statusCode = metrics.status === 'healthy' ? 200 : 503;
    return NextResponse.json(metrics, { status: statusCode });
  } catch (error) {
    logger.error('Monitoring error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Monitoring failed',
      },
      { status: 500 }
    );
  }
}
