/**
 * Sync Manager Types
 * Type definitions for the real-time sync system
 */

export interface SyncMessage {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: number;
  room?: string;
}

export interface ConnectionInfo {
  userId: number;
  role: 'student' | 'admin';
  rooms: string[];
  connectedAt: Date;
  lastPing: Date;
}

export interface RoomSubscription {
  room: string;
  userId: number;
  role: 'student' | 'admin';
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export interface SyncEvent {
  type: string;
  entity: string;
  entityId: number;
  action: string;
  data: any;
  timestamp: Date;
  userId?: number;
  adminId?: number;
}
