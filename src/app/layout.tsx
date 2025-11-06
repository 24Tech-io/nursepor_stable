import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LMS Platform',
  description: 'Learning Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-screen antialiased text-slate-100">{children}</body>
    </html>
  )
}
