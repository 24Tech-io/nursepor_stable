import type { Metadata } from 'next';
import './globals.css';
import { ChunkErrorHandler } from './chunk-error-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Nurse Pro Academy',
  description: 'Professional Nursing Education Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress AWS Amplify SDK errors (harmless but noisy)
              if (typeof window !== 'undefined') {
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  // Suppress AWS Amplify SDK errors
                  if (
                    message.includes('RegisterClientLocalizationsError') ||
                    message.includes('MessageNotSentError') ||
                    message.includes('Uncaught (in promise) RegisterClientLocalizationsError') ||
                    message.includes('Uncaught (in promise) MessageNotSentError')
                  ) {
                    // Silently ignore AWS Amplify SDK errors
                    return;
                  }
                  originalConsoleError.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased text-slate-100">
        <ErrorBoundary>
          <ChunkErrorHandler />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
