import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/admin-app/QueryProvider'

export const metadata: Metadata = {
  title: 'NursePro Academy',
  description: 'Professional Nursing Education Platform - NCLEX Preparation & Nursing Courses',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NursePro Academy',
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e31c25' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

import InstallPrompt from '@/components/pwa/InstallPrompt'
import NetworkStatus from '@/components/pwa/NetworkStatus'
import UpdateNotification from '@/components/pwa/UpdateNotification'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="NursePro Academy" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NursePro Academy" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Icons */}
        <link rel="icon" href="/logo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen antialiased text-slate-100">
        <QueryProvider>
          {children}
          <InstallPrompt />
          <NetworkStatus />
          <UpdateNotification />
        </QueryProvider>
      </body>
    </html>
  );
}
