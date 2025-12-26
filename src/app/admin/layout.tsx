'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QueryProvider } from '@/components/admin-app/QueryProvider';
import { NotificationProvider } from '@/components/admin-app/NotificationProvider';

// Auth cache (shared across all admin routes)
const AUTH_CACHE_KEY = 'admin_auth_cache';
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

function clearCachedAuth(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(AUTH_CACHE_KEY);
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Skip auth check for public admin routes
    const isPublicRoute = pathname === '/admin/login' ||
        pathname === '/admin/register' ||
        pathname === '/admin';

    // Check authentication once (cached)
    useEffect(() => {
        if (isPublicRoute) {
            setIsLoading(false);
            setIsAuthenticated(true); // Allow public routes
            return;
        }

        async function checkAuth() {
            try {
                // Check cache first
                const cached = getCachedAuth();
                if (cached && cached.user && cached.user.role === 'admin') {
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                }

                // Check if we have a redirect flag from login
                const shouldRetry = sessionStorage.getItem('shouldRedirect') === 'true';
                if (shouldRetry) {
                    sessionStorage.removeItem('shouldRedirect');
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                const response = await fetch('/api/auth/me?type=admin', {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user && data.user.role === 'admin') {
                        setCachedAuth(data.user);
                        setIsAuthenticated(true);
                        setIsLoading(false);
                        return;
                    }
                }

                // Not authenticated
                clearCachedAuth();
                sessionStorage.clear();
                router.replace('/admin/login');
            } catch (error) {
                clearCachedAuth();
                sessionStorage.clear();
                router.replace('/admin/login');
            } finally {
                setIsLoading(false);
            }
        }

        checkAuth();
    }, [pathname, isPublicRoute, router]);

    // Show loading state for protected routes
    if (!isPublicRoute && isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Protected routes - check auth
    if (!isPublicRoute && !isAuthenticated) {
        return null; // Will redirect
    }

    // Wrap in providers (persists across navigation)
    return (
        <QueryProvider>
            <NotificationProvider>
                {children}
            </NotificationProvider>
        </QueryProvider>
    );
}
