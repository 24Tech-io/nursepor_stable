/**
 * React Hook for Connection Monitoring
 */

import { useState, useEffect } from 'react';
import { connectionMonitor } from '@/lib/connection-monitor';

export function useConnection() {
  const [isSlow, setIsSlow] = useState(connectionMonitor.isSlow());
  const [connectionInfo, setConnectionInfo] = useState(connectionMonitor.getInfo());

  useEffect(() => {
    const unsubscribe = connectionMonitor.onConnectionChange((slow) => {
      setIsSlow(slow);
      setConnectionInfo(connectionMonitor.getInfo());
    });

    return unsubscribe;
  }, []);

  return {
    isSlow,
    connectionInfo,
    recommendedTimeout: connectionMonitor.getRecommendedTimeout(),
    recommendedRetryDelay: connectionMonitor.getRecommendedRetryDelay(),
  };
}

