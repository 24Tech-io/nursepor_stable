/**
 * Broadcast Manager
 * Routes DataManager events to appropriate WebSocket rooms
 */

import { dataManagerEvents } from '@/lib/data-manager/events/event-emitter';
import { EventType, DataManagerEvent, EnrollmentEvent, ProgressEvent, RequestEvent } from '@/lib/data-manager/events/event-types';
import { ConnectionManager } from './connection-manager';
import { SyncEvent } from '../types';

export class BroadcastManager {
  private static instance: BroadcastManager;
  private connectionManager: ConnectionManager;
  private broadcastFunction?: (room: string, event: SyncEvent) => void;

  private constructor() {
    this.connectionManager = ConnectionManager.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): BroadcastManager {
    if (!BroadcastManager.instance) {
      BroadcastManager.instance = new BroadcastManager();
    }
    return BroadcastManager.instance;
  }

  /**
   * Set the broadcast function (called by WebSocket server)
   */
  setBroadcastFunction(fn: (room: string, event: SyncEvent) => void): void {
    this.broadcastFunction = fn;
  }

  /**
   * Setup listeners for DataManager events
   */
  private setupEventListeners(): void {
    // Enrollment events
    dataManagerEvents.onEvent(EventType.ENROLLMENT_CREATED, (event: DataManagerEvent) => {
      this.broadcastEnrollmentEvent(event as EnrollmentEvent);
    });
    dataManagerEvents.onEvent(EventType.ENROLLMENT_REMOVED, (event: DataManagerEvent) => {
      this.broadcastEnrollmentEvent(event as EnrollmentEvent);
    });
    dataManagerEvents.onEvent(EventType.ENROLLMENT_UPDATED, (event: DataManagerEvent) => {
      this.broadcastEnrollmentEvent(event as EnrollmentEvent);
    });

    // Progress events
    dataManagerEvents.onEvent(EventType.PROGRESS_UPDATED, (event: DataManagerEvent) => {
      this.broadcastProgressEvent(event as ProgressEvent);
    });
    dataManagerEvents.onEvent(EventType.CHAPTER_COMPLETED, (event: DataManagerEvent) => {
      this.broadcastProgressEvent(event as ProgressEvent);
    });
    dataManagerEvents.onEvent(EventType.VIDEO_COMPLETED, (event: DataManagerEvent) => {
      this.broadcastProgressEvent(event as ProgressEvent);
    });
    dataManagerEvents.onEvent(EventType.QUIZ_SUBMITTED, (event: DataManagerEvent) => {
      this.broadcastProgressEvent(event as ProgressEvent);
    });

    // Request events
    dataManagerEvents.onEvent(EventType.REQUEST_CREATED, (event: DataManagerEvent) => {
      this.broadcastRequestEvent(event as RequestEvent);
    });
    dataManagerEvents.onEvent(EventType.REQUEST_APPROVED, (event: DataManagerEvent) => {
      this.broadcastRequestEvent(event as RequestEvent);
    });
    dataManagerEvents.onEvent(EventType.REQUEST_REJECTED, (event: DataManagerEvent) => {
      this.broadcastRequestEvent(event as RequestEvent);
    });
    dataManagerEvents.onEvent(EventType.REQUEST_DELETED, (event: DataManagerEvent) => {
      this.broadcastRequestEvent(event as RequestEvent);
    });
  }

  /**
   * Broadcast enrollment event
   */
  private broadcastEnrollmentEvent(event: EnrollmentEvent): void {
    const syncEvent: SyncEvent = {
      type: event.type,
      entity: 'enrollment',
      entityId: event.courseId,
      action: event.type.split(':')[1],
      data: {
        studentId: event.studentId,
        courseId: event.courseId,
        source: event.source,
      },
      timestamp: event.timestamp,
      userId: event.userId,
      adminId: event.adminId,
    };

    // Broadcast to student's room
    this.broadcast(`user:${event.studentId}`, syncEvent);

    // Broadcast to admin rooms
    this.broadcast('admin:all', syncEvent);
    this.broadcast('admin:students', syncEvent);
  }

  /**
   * Broadcast progress event
   */
  private broadcastProgressEvent(event: ProgressEvent): void {
    const syncEvent: SyncEvent = {
      type: event.type,
      entity: 'progress',
      entityId: event.courseId,
      action: event.type.split(':')[1],
      data: {
        studentId: event.studentId,
        courseId: event.courseId,
        progress: event.progress,
        previousProgress: event.previousProgress,
        metadata: event.metadata,
      },
      timestamp: event.timestamp,
      userId: event.userId,
    };

    // Broadcast to student's room
    this.broadcast(`user:${event.studentId}`, syncEvent);

    // Broadcast to admin rooms
    this.broadcast('admin:students', syncEvent);
    this.broadcast('admin:analytics', syncEvent);
  }

  /**
   * Broadcast request event
   */
  private broadcastRequestEvent(event: RequestEvent): void {
    const syncEvent: SyncEvent = {
      type: event.type,
      entity: 'request',
      entityId: event.requestId,
      action: event.type.split(':')[1],
      data: {
        requestId: event.requestId,
        studentId: event.studentId,
        courseId: event.courseId,
        reason: event.reason,
      },
      timestamp: event.timestamp,
      userId: event.userId,
      adminId: event.adminId,
    };

    // Broadcast to student's room
    this.broadcast(`user:${event.studentId}`, syncEvent);

    // Broadcast to admin rooms
    this.broadcast('admin:all', syncEvent);
    this.broadcast('admin:requests', syncEvent);
  }

  /**
   * Broadcast to a room
   */
  private broadcast(room: string, event: SyncEvent): void {
    if (this.broadcastFunction) {
      this.broadcastFunction(room, event);
    }
  }

  /**
   * Manual broadcast (for testing or direct use)
   */
  manualBroadcast(room: string, event: SyncEvent): void {
    this.broadcast(room, event);
  }
}

