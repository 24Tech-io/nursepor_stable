"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import RoleSwitcher from '@/components/common/RoleSwitcher';

const nav = [
  { name: 'Students', href: '/admin/students', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20H4v-2a4 4 0 014-4h1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  )},
  { name: 'Courses', href: '/admin/courses', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.168 5.477C14.754 5 16.34 5 18 5c1.747 0 3.332.477 4.5 1.253v13C21.332 18.477 19.747 18 18 18c-1.66 0-3.246.477-4.832 1.253" /></svg>
  )},
  { name: 'Requests', href: '/admin/requests', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" /></svg>
  )},
  { name: 'Blogs', href: '/admin/blogs', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V7a2 2 0 012-2h10l4 4v9a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h6M7 12h10M7 16h10" /></svg>
  )},
  { name: 'Reports', href: '/admin/reports', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V9m6 10V5M5 19h14" /></svg>
  )},
  { name: 'Profile', href: '/admin/profile', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  )},
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black">
      <nav className="bg-white/10 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/students" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-[0_10px_40px_-12px_rgba(99,102,241,0.6)]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.8 5.5 9.2 5 7.5 5 5.8 5 4.2 5.5 3 6.253v13" /></svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">Nurse Pro Academy</span>
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            <RoleSwitcher />
            {nav.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`relative px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${active ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-[0_10px_40px_-12px_rgba(99,102,241,0.6)]' : 'text-slate-200 hover:bg-white/10'}`}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout} className="ml-2 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10 rounded-xl border border-red-500/30">Logout</button>
          </div>
          <button className="md:hidden text-slate-200" onClick={() => setIsOpen(!isOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {isOpen && (
          <div className="md:hidden border-t border-white/10">
            <div className="px-4 py-3 space-y-1">
              {nav.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white' : 'text-slate-200 hover:bg-white/10'}`}>
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <Link href="/admin/profile" onClick={() => setIsOpen(false)} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-200 hover:bg-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span>Profile</span>
              </Link>
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-red-200 hover:bg-red-500/10 border border-red-500/30">Logout</button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
