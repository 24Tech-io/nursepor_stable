import { getDatabase } from './db';
import { activityLogs } from './db/schema';

export interface ActivityLogData {
  adminId: number;
  adminName: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'approved' | 'rejected';
  entityType: 'course' | 'student' | 'question' | 'module' | 'chapter' | 'access_request' | 'blog' | 'admin';
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, any> | null;
}

export async function logActivity(data: ActivityLogData) {
  try {
    const db = getDatabase();
    await db.insert(activityLogs).values({
      adminId: data.adminId,
      adminName: data.adminName,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      entityName: data.entityName || null,
      details: data.details ? JSON.stringify(data.details) : null,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
}

