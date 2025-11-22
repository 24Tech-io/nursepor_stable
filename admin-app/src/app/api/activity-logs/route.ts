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

    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      adminName: log.adminName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      details: log.details ? JSON.parse(log.details) : null,
      createdAt: log.createdAt?.toISOString(),
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch activity logs', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

