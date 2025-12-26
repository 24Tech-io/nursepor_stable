'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side chunk error handler
 * Only reloads on actual chunk loading failures (not all errors)
 * Includes debouncing to prevent multiple rapid reloads
 */
export function ChunkErrorHandler() {
  const router = useRouter();
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReloadTimeRef = useRef<number>(0);
  const reloadCountRef = useRef<number>(0);

  useEffect(() => {
    // Debounced reload function - prevents multiple rapid reloads
    const debouncedReload = () => {
      const now = Date.now();
      const timeSinceLastReload = now - lastReloadTimeRef.current;
      
      // Prevent reload if we just reloaded less than 5 seconds ago
      if (timeSinceLastReload < 5000) {
        console.warn('Chunk error detected but reload was recent, skipping...');
        return;
      }
      
      // Prevent infinite reload loops (max 3 reloads per 30 seconds)
      if (timeSinceLastReload < 30000) {
        reloadCountRef.current++;
        if (reloadCountRef.current > 3) {
          console.error('Too many chunk reload attempts, stopping to prevent loop');
          return;
        }
      } else {
        reloadCountRef.current = 0;
      }
      
      lastReloadTimeRef.current = now;
      
      // Clear any existing timeout
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      
      // Debounce reload by 2 seconds
      reloadTimeoutRef.current = setTimeout(() => {
        console.warn('Chunk loading error detected, reloading page...');
        window.location.reload();
      }, 2000);
    };

    // Handle chunk loading errors - only actual chunk failures
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      const message = error?.message || event.message || '';
      const filename = event.filename || '';
      
      // Only handle actual chunk loading errors, not other errors
      const isChunkError = 
        (message.includes('chunk') || message.includes('Loading chunk')) &&
        (filename.includes('.js') || filename.includes('chunk') || filename.includes('webpack'));
      
      if (isChunkError) {
        event.preventDefault();
        debouncedReload();
      }
    };

    // Handle unhandled promise rejections (chunk load failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      // Suppress AWS Amplify SDK errors (harmless but noisy)
      if (reason && typeof reason === 'object' && 'name' in reason) {
        const errorName = String(reason.name || '');
        if (
          errorName.includes('RegisterClientLocalizationsError') ||
          errorName.includes('MessageNotSentError')
        ) {
          event.preventDefault();
          return; // Silently ignore AWS Amplify SDK errors
        }
      }
      
      // Only handle actual chunk loading failures
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = String(reason.message || '');
        const isChunkError = 
          message.includes('chunk') || 
          message.includes('Loading chunk') ||
          message.includes('Failed to fetch dynamically imported module');
        
        if (isChunkError) {
          console.warn('Chunk loading promise rejection detected');
          event.preventDefault();
          debouncedReload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [router]);

  return null;
}

