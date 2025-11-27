/**
 * Event Emitter
 * Centralized event system for DataManager operations
 * Events are emitted here and consumed by the Real-Time Sync System (Phase 2)
 */

import { EventEmitter } from 'events';
import { DataManagerEvent, EventType } from './event-types';

class DataManagerEventEmitter extends EventEmitter {
  private static instance: DataManagerEventEmitter;

  private constructor() {
    super();
    // Increase max listeners for high-volume operations
    this.setMaxListeners(100);
  }

  static getInstance(): DataManagerEventEmitter {
    if (!DataManagerEventEmitter.instance) {
      DataManagerEventEmitter.instance = new DataManagerEventEmitter();
    }
    return DataManagerEventEmitter.instance;
  }

  /**
   * Emit a data manager event
   */
  emitEvent(event: DataManagerEvent): void {
    try {
      // Emit with both specific type and wildcard
      this.emit(event.type, event);
      this.emit('*', event); // Wildcard for global listeners
      
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📢 Event emitted: ${event.type}`, {
          entity: event.type.split(':')[0],
          action: event.type.split(':')[1],
          timestamp: event.timestamp,
        });
      }
    } catch (error) {
      console.error('❌ Error emitting event:', error);
      // Don't throw - event emission should never break operations
    }
  }

  /**
   * Subscribe to specific event type
   */
  onEvent(eventType: EventType, handler: (event: DataManagerEvent) => void): void {
    this.on(eventType, handler);
  }

  /**
   * Subscribe to all events
   */
  onAllEvents(handler: (event: DataManagerEvent) => void): void {
    this.on('*', handler);
  }

  /**
   * Unsubscribe from event
   */
  offEvent(eventType: EventType, handler: (event: DataManagerEvent) => void): void {
    this.off(eventType, handler);
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.listenerCount(eventType);
    }
    return this.listenerCount('*');
  }
}

// Export singleton instance
export const dataManagerEvents = DataManagerEventEmitter.getInstance();

