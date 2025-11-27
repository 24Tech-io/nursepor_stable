/**
 * Connection Manager
 * Manages WebSocket connections and room subscriptions
 */

import { ConnectionInfo, RoomSubscription } from '../types';

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, ConnectionInfo> = new Map(); // connectionId -> ConnectionInfo
  private rooms: Map<string, Set<string>> = new Map(); // room -> Set<connectionId>

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Add a connection
   */
  addConnection(connectionId: string, userId: number, role: 'student' | 'admin'): void {
    const rooms = this.getRoomsForUser(userId, role);
    
    this.connections.set(connectionId, {
      userId,
      role,
      rooms,
      connectedAt: new Date(),
      lastPing: new Date(),
    });

    // Subscribe to rooms
    rooms.forEach(room => {
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room)!.add(connectionId);
    });

    console.log(`✅ Connection ${connectionId} added for user ${userId} (${role}), subscribed to ${rooms.length} rooms`);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Unsubscribe from all rooms
      connection.rooms.forEach(room => {
        const roomConnections = this.rooms.get(room);
        if (roomConnections) {
          roomConnections.delete(connectionId);
          if (roomConnections.size === 0) {
            this.rooms.delete(room);
          }
        }
      });
    }
    this.connections.delete(connectionId);
    console.log(`🗑️ Connection ${connectionId} removed`);
  }

  /**
   * Get rooms for a user based on their role
   */
  private getRoomsForUser(userId: number, role: 'student' | 'admin'): string[] {
    const rooms: string[] = [];

    if (role === 'student') {
      rooms.push(`user:${userId}`);
    } else if (role === 'admin') {
      rooms.push('admin:all');
      rooms.push('admin:requests');
      rooms.push('admin:students');
      rooms.push('admin:analytics');
    }

    return rooms;
  }

  /**
   * Get all connections in a room
   */
  getConnectionsInRoom(room: string): string[] {
    const connections = this.rooms.get(room);
    return connections ? Array.from(connections) : [];
  }

  /**
   * Get connection info
   */
  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Update last ping time
   */
  updatePing(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastPing = new Date();
    }
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }
}

