'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';

export default function AdminDashboard() {
  const [queryClient] = useState(() => new QueryClient());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<string>('dashboard');
  const router = useRouter();

  // Get module from URL query parameter - must be called before any conditional returns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const moduleParam = params.get('module');
      if (moduleParam) {
        setModule(moduleParam);
      }
    }
  }, []);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('🔐 [Dashboard] Starting auth check...');

        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`📡 [Dashboard] Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [Dashboard] Auth check passed, user:', data.user);
          if (data.user && data.user.role === 'admin') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } else {
            // User exists but not admin - redirect to student login
            console.log('❌ [Dashboard] User is not an admin, redirecting to student login');
            sessionStorage.clear();
            window.location.replace('/login');
            return;
          }
        } else {
          // Not authenticated - redirect to admin login
          console.log('❌ [Dashboard] Not authenticated, redirecting to admin login');
          sessionStorage.clear();
          window.location.replace('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.clear();
        window.location.replace('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NurseProAdminUltimate initialModule={module} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}

