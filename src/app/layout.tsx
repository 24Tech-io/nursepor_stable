import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/admin-app/QueryProvider'

export const metadata: Metadata = {
  title: 'Nurse Pro Academy',
  description: 'Professional Nursing Education Platform - NCLEX Preparation & Nursing Courses',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-screen antialiased text-slate-100">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
