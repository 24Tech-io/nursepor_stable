'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';
import { NotificationProvider } from '@/components/NotificationProvider';

export default function AdminDashboard() {
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

        // Check if we have a redirect flag from login
        const shouldRetry = sessionStorage.getItem('shouldRedirect') === 'true';
        if (shouldRetry) {
          sessionStorage.removeItem('shouldRedirect');
          console.log('✅ [Dashboard] Redirect flag found, waiting for cookie to be set...');
          // Wait a bit for cookie to be set
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        console.log('📍 [Dashboard] Attempt 1: Checking /api/auth/me...');
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`📡 [Dashboard] Attempt 1 response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [Dashboard] Auth check passed, user:', data.user);
          if (data.user && data.user.role === 'admin') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } else {
            // User exists but not admin - redirect to login
            console.log('❌ [Dashboard] User is not an admin, redirecting to login');
            sessionStorage.clear();
            window.location.replace('/login');
            return;
          }
        } else if (response.status === 401 || response.status === 403) {
          // Not authenticated or unauthorized - redirect immediately
          console.log('❌ [Dashboard] Not authenticated (401/403), redirecting to login');
          sessionStorage.clear();
          window.location.replace('/login');
          return;
        }

        // Not authenticated - retry if we just logged in
        if (shouldRetry) {
          console.log('⏳ [Dashboard] First attempt failed, retrying after additional delay...');
          await new Promise((resolve) => setTimeout(resolve, 1500));

          console.log('📍 [Dashboard] Attempt 2: Checking /api/auth/me...');
          const retryResponse = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log(`📡 [Dashboard] Attempt 2 response status: ${retryResponse.status}`);

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('✅ [Dashboard] Retry auth check passed:', retryData.user);
            if (retryData.user && retryData.user.role === 'admin') {
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } else {
            console.log(
              '❌ [Dashboard] Retry auth check failed with status:',
              retryResponse.status
            );
            try {
              const errorData = await retryResponse.json();
              console.log('❌ [Dashboard] Error details:', errorData);
            } catch (e) {
              console.log('❌ [Dashboard] Could not parse error response');
            }
          }
        }

        // Not authenticated - clear any stale session data
        sessionStorage.clear();
        console.log('❌ [Dashboard] Not authenticated after all attempts, redirecting to login');
        window.location.replace('/login');
      } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.clear();
        window.location.replace('/login');
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
    <NotificationProvider>
      <NurseProAdminUltimate initialModule={module} />
    </NotificationProvider>
  );
}
