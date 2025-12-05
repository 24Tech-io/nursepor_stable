'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side chunk error handler
 * Automatically retries loading failed chunks
 */
export function ChunkErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    // Handle chunk loading errors
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      
      if (error && error.message && error.message.includes('chunk')) {
        console.warn('Chunk loading error detected, reloading page...');
        
        // Retry by reloading the page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    // Handle unhandled promise rejections (chunk load failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = String(reason.message || '');
        if (message.includes('chunk') || message.includes('Loading chunk')) {
          console.warn('Chunk loading promise rejection, reloading page...');
          event.preventDefault();
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);

  return null;
}

