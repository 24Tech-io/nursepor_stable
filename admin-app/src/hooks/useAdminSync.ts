/**
 * useAdminSync Hook
 * React hook for integrating admin sync client into components
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminSyncClient, ConnectionState } from '@/lib/sync-client';

export interface SyncData {
  timestamp: Date;
  data: any;
}

export function useAdminSync() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastSync, setLastSync] = useState<SyncData | null>(null);
  const [healthWarning, setHealthWarning] = useState<any>(null);

  useEffect(() => {
    // Start sync client
    adminSyncClient.start();

    // Set up event listeners
    const handleConnected = (data: any) => {
      setConnectionState('connected');
      console.log('✅ Admin sync connected:', data);
    };

    const handleSync = (data: any) => {
      setLastSync({
        timestamp: new Date(),
        data,
      });
      console.log('📡 Admin sync update received:', data);
    };

    const handleHealthWarning = (warning: any) => {
      setHealthWarning(warning);
      console.warn('⚠️ Admin sync health warning:', warning);
    };

    const handleDisconnected = (data: any) => {
      setConnectionState('disconnected');
      console.error('❌ Admin sync disconnected:', data);
    };

    // Subscribe to events
    adminSyncClient.on('connected', handleConnected);
    adminSyncClient.on('sync', handleSync);
    adminSyncClient.on('health-warning', handleHealthWarning);
    adminSyncClient.on('disconnected', handleDisconnected);

    // Update connection state
    setConnectionState(adminSyncClient.getConnectionState());

    // Cleanup
    return () => {
      adminSyncClient.off('connected', handleConnected);
      adminSyncClient.off('sync', handleSync);
      adminSyncClient.off('health-warning', handleHealthWarning);
      adminSyncClient.off('disconnected', handleDisconnected);
      adminSyncClient.stop();
    };
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    await adminSyncClient.forceSync();
  }, []);

  // Validate sync
  const validateSync = useCallback(async () => {
    return await adminSyncClient.validateSync();
  }, []);

  // Auto-fix
  const autoFix = useCallback(async () => {
    return await adminSyncClient.autoFix();
  }, []);

  return {
    connectionState,
    lastSync,
    healthWarning,
    forceSync,
    validateSync,
    autoFix,
    isConnected: connectionState === 'connected',
  };
}

