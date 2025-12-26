'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { QueryProvider } from '@/components/admin-app/QueryProvider';
import { syncClient } from '@/lib/sync-client';
import LoadingScreen from '@/components/student/LoadingScreen';

// Auth caching
const AUTH_CACHE_KEY = 'student_auth_cache';
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedAuth(): { user: any; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age > AUTH_CACHE_TTL) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedAuth(user: any): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
      user,
      timestamp: Date.now(),
    }));
  } catch { }
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/student/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: 'My Courses',
    href: '/student/courses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  {
    name: 'Q-Banks',
    href: '/student/qbanks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    name: 'Progress',
    href: '/student/progress',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Authentication Check
  useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Check Cache
        const cached = getCachedAuth();
        if (cached && cached.user && cached.user.role === 'student') {
          setUser(cached.user);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // 2. Fetch from API
        const response = await fetch('/api/auth/me?type=student', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'student') {
            setCachedAuth(data.user);
            setUser(data.user);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }

        // 3. Retry logic for reliability
        const shouldRetry = sessionStorage.getItem('shouldRedirect') === 'true';
        if (shouldRetry || response.status === 401) {
          await new Promise(r => setTimeout(r, 1000));
          const retryRes = await fetch('/api/auth/me?type=student', {
            credentials: 'include', cache: 'no-store'
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData.user && retryData.user.role === 'student') {
              setCachedAuth(retryData.user);
              setUser(retryData.user);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
        }

        // Failed
        sessionStorage.removeItem(AUTH_CACHE_KEY);
        router.replace('/login');
      } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.removeItem(AUTH_CACHE_KEY);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      sessionStorage.clear();
    } catch { }
    router.replace('/login');
  }

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Fetch Notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          const notifs = (data.notifications || []).map((n: any) => ({
            id: n.id,
            message: n.message,
            title: n.title || n.message,
            time: formatTimeAgo(new Date(n.createdAt)),
            read: n.isRead,
            type: n.type || 'info',
          }));
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n: any) => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 300000);

    // Start sync client
    if (typeof window !== 'undefined') {
      syncClient.start();
    }

    return () => {
      clearInterval(interval);
      syncClient.stop();
    };
  }, [isAuthenticated, user]);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Render Loading State
  if (isLoading) {
    return <LoadingScreen message="Loading Student Portal..." />;
  }

  // Prevent flash of content if not authenticated (though router.replace handles it)
  if (!isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation Bar - Dark Glass */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/student/dashboard" className="flex items-center space-x-3">
                <Image
                  src="/logo.png"
                  alt="Nurse Pro Academy"
                  width={44}
                  height={44}
                  loading="lazy"
                  fetchPriority="low"
                  unoptimized
                  className="animate-pulse-glow"
                />
                <span className="text-2xl font-bold text-white">
                  Nurse Pro <span className="text-nurse-red-500">Academy</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      relative px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center space-x-2
                      ${isActive
                        ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
                        : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Profile & Notifications */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-nurse-silver-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-nurse-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-dark-xl border border-white/10 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-bold text-white">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-nurse-silver-500 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="divide-y divide-white/10">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-white/5 transition cursor-pointer ${!notification.read ? 'bg-nurse-red-500/10 border-l-2 border-nurse-red-500' : ''}`}
                            onClick={async () => {
                              if (!notification.read) {
                                try {
                                  await fetch('/api/notifications', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ notificationId: notification.id }),
                                  });
                                  setNotifications(prev =>
                                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                                  );
                                  setUnreadCount(prev => Math.max(0, prev - 1));
                                } catch (error) {
                                  console.error('Failed to mark notification as read:', error);
                                }
                              }
                            }}
                          >
                            <p className="text-sm text-white font-medium">{notification.title || notification.message}</p>
                            <p className="text-xs text-nurse-silver-500 mt-1">{notification.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-nurse-silver-500 text-sm">No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-3 p-2 hover:bg-white/10 rounded-xl transition">
                  <div className="w-9 h-9 bg-gradient-to-br from-nurse-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-glow-red">
                    <span className="text-white font-bold text-sm">
                      {user ? getUserInitials(user.name) : 'U'}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-white">
                      {user?.name || 'Loading...'}
                    </p>
                    <p className="text-xs text-nurse-silver-400 capitalize">
                      {user?.role || 'Student'}
                    </p>
                  </div>
                </button>

                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-dark-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-4 border-b border-white/10">
                    <p className="font-semibold text-white">{user?.name}</p>
                    <p className="text-sm text-nurse-silver-400">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/student/profile" className="flex items-center space-x-2 px-4 py-2 text-sm text-nurse-silver-300 hover:text-white hover:bg-white/10 rounded-lg transition">
                      <span>My Profile</span>
                    </Link>
                  </div>
                  <div className="p-2 border-t border-white/10">
                    <button onClick={handleLogout} className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-nurse-red-400 hover:bg-nurse-red-500/10 rounded-lg transition">
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-nurse-silver-400 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all
                    ${pathname === item.href
                      ? 'bg-gradient-to-r from-nurse-red-600 to-red-600 text-white shadow-glow-red'
                      : 'text-nurse-silver-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QueryProvider>
          {children}
        </QueryProvider>
      </main>

      <footer className="bg-slate-900/50 border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-nurse-silver-500">
            © 2024 Nurse Pro Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
