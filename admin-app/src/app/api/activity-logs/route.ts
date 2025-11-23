import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { activityLogs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let logs: any[] = [];
    try {
      logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
    } catch (tableError: any) {
      // If table doesn't exist, return empty array instead of error
      if (tableError?.message && (tableError.message.includes('does not exist') || tableError.message.includes('relation'))) {
        console.warn('⚠️ activity_logs table does not exist yet. Run migration to create it.');
        return NextResponse.json({ logs: [] });
      }
      // Log the actual error for debugging
      console.error('Activity logs query error:', tableError);
      // Return empty array to prevent breaking the dashboard
      return NextResponse.json({ logs: [] });
    }

    const formattedLogs = logs.map((log: any) => {
      let details = null;
      try {
        if (log.details && typeof log.details === 'string') {
          details = JSON.parse(log.details);
        } else if (log.details) {
          details = log.details;
        }
      } catch (e) {
        console.warn('Failed to parse activity log details:', e);
        details = null;
      }

      return {
        id: log.id,
        adminId: log.adminId,
        adminName: log.adminName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: log.entityName,
        details,
        createdAt: log.createdAt?.toISOString(),
      };
    });

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch activity logs', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

