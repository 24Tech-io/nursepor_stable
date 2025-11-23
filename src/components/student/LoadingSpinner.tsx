'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  message, 
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  const containerClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-20';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-purple-600 border-t-transparent mx-auto`}></div>
        {message && (
          <p className="mt-4 text-gray-600 text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}

