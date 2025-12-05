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
      <body className="min-h-screen antialiased text-slate-100">
        <ErrorBoundary>
          <ChunkErrorHandler />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
