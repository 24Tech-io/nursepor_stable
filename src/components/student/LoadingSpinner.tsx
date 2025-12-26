'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  message,
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  const containerClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen bg-slate-950'
    : 'flex items-center justify-center py-20';

  return (
    <div className={containerClasses}>
      {/* Red Spotlight Effect for fullscreen */}
      {fullScreen && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(227,28,37,0.08),_transparent_60%)]" />
      )}
      
      <div className="text-center relative z-10">
        {/* Animated Spinner with Glow */}
        <div className="relative">
          <div className={`animate-spin rounded-full ${sizeClasses[size]} border-nurse-red-500 border-t-transparent mx-auto shadow-glow-red`}></div>
          
          {/* Pulsing Ring Effect */}
          {fullScreen && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-nurse-red-500/20 animate-ping" />
            </div>
          )}
        </div>
        
        {message && (
          <p className="mt-4 text-nurse-silver-400 text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
