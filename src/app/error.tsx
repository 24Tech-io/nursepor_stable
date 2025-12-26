'use client';

import { useEffect, useState } from 'react';
import Logo from '@/components/common/Logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isChunkError, setIsChunkError] = useState(false);

  useEffect(() => {
    console.error('Application error:', error);
    
    // Check if it's a chunk loading error or module resolution error
    const errorMessage = error.message || '';
    const isChunk = errorMessage.includes('chunk') || 
                    errorMessage.includes('Loading chunk') ||
                    errorMessage.includes('ChunkLoadError') ||
                    errorMessage.includes('Cannot find module') ||
                    errorMessage.includes('./') && errorMessage.match(/\.\/\d+\.js/);
    
    setIsChunkError(isChunk);
    
    // Auto-reload on chunk/module errors
    if (isChunk) {
      console.warn('Chunk/module loading error detected, reloading in 2 seconds...');
      const timer = setTimeout(() => {
        // Clear cache and reload
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        window.location.reload();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" className="text-white" />
          </div>
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isChunkError ? 'Loading Error' : 'Something went wrong!'}
          </h2>
          <p className="text-slate-300 mb-6">
            {isChunkError 
              ? 'Failed to load application resources. Reloading page...' 
              : error.message || 'An unexpected error occurred'}
          </p>
          {isChunkError ? (
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent"></div>
              <span>Reloading...</span>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-fuchsia-700 transition shadow-lg"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition border border-white/20"
              >
                Go home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
