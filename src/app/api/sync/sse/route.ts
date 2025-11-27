/**
 * Server-Sent Events (SSE) Endpoint
 * Provides real-time updates via SSE for better Next.js compatibility
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { BroadcastManager } from '@/lib/sync-manager/server/broadcast-manager';
import { ConnectionManager } from '@/lib/sync-manager/server/connection-manager';
import { SyncEvent } from '@/lib/sync-manager/types';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return new Response('Invalid token', { status: 401 });
    }
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }

  const userId = decoded.id;
  const role = decoded.role === 'admin' ? 'admin' : 'student';
  const connectionId = `sse_${userId}_${Date.now()}`;

  // Setup connection
  const connectionManager = ConnectionManager.getInstance();
  const broadcastManager = BroadcastManager.getInstance();

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      send({ type: 'connected', connectionId, userId, role });

      // Setup broadcast handler
      const broadcastHandler = (room: string, event: SyncEvent) => {
        // Get user's rooms
        const userRooms = role === 'admin'
          ? ['admin:all', 'admin:requests', 'admin:students', 'admin:analytics']
          : [`user:${userId}`];

        // Check if event should be sent to this connection
        if (userRooms.includes(room)) {
          send({
            type: 'sync',
            event,
            room,
          });
        }
      };

      broadcastManager.setBroadcastFunction(broadcastHandler);
      connectionManager.addConnection(connectionId, userId, role);

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
        connectionManager.updatePing(connectionId);
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        connectionManager.removeConnection(connectionId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}

