import { NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/db';
import { performanceMonitor } from '@/lib/performance';
import { connectionMonitor } from '@/lib/connection-monitor';
import { apiClient } from '@/lib/api-client';

/**
 * Health check endpoint with performance metrics
 */
export async function GET() {
  const startTime = performance.now();

  try {
    // Check database health
    const dbHealthy = await getDatabaseHealth();

    // Get performance metrics
    const perfReport = performanceMonitor.getReport();

    // Get connection info
    const connectionInfo = connectionMonitor.getInfo();

    // Get API client stats
    const apiStats = apiClient.getCacheStats();

    const responseTime = performance.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      database: {
        connected: dbHealthy,
        status: dbHealthy ? 'healthy' : 'unhealthy',
      },
      performance: {
        longTasks: perfReport.longTasks.length,
        averageTaskTime: `${perfReport.averageTaskTime.toFixed(2)}ms`,
      },
      connection: connectionInfo,
      cache: apiStats,
    });
  } catch (error: any) {
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
