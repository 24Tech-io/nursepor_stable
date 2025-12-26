'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NurseProAdminUltimate from '@/components/admin/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/admin/NotificationProvider';
import { getQueryClient } from '@/lib/query-client';

export default function AdminDashboard() {
  const [queryClient] = useState(() => getQueryClient());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<string>('dashboard');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get module from URL query parameter - updates when URL changes
  useEffect(() => {
    const moduleParam = searchParams.get('module');
    if (moduleParam) {
      setModule(moduleParam);
    } else {
      setModule('dashboard'); // Default to dashboard if no module param
    }
  }, [searchParams]);

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('🔐 [Dashboard] Starting auth check...');

        const response = await fetch('/api/auth/me?type=admin', {
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
            router.push('/login');
            return;
          }
        } else {
          // Not authenticated - redirect to admin login
          console.log('❌ [Dashboard] Not authenticated, redirecting to admin login');
          sessionStorage.clear();
          router.push('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.clear();
        router.push('/admin/login');
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

