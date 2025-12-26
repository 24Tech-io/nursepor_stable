'use client';

import { useEffect, useState } from 'react';
import { connectionMonitor } from '@/lib/connection-monitor';

interface RequestTimeoutProps {
  timeout: number;
  onTimeout: () => void;
  message?: string;
}

/**
 * Component that shows timeout warning for slow requests
 */
export function RequestTimeout({ timeout, onTimeout, message }: RequestTimeoutProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        
        // Show warning when 30% of time remains
        if (newTime <= timeout * 0.3 && !showWarning) {
          setShowWarning(true);
        }
        
        // Trigger timeout
        if (newTime <= 0) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeout, onTimeout, showWarning]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      <div>
        <p className="font-semibold">Request taking longer than expected</p>
        <p className="text-sm opacity-90">
          {message || `Please wait... (${Math.ceil(timeRemaining / 1000)}s remaining)`}
        </p>
      </div>
    </div>
  );
}

