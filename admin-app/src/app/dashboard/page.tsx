'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NurseProAdminUltimate from '@/components/UnifiedAdminSuite';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        console.log('📍 [Dashboard] Attempt 1: Checking /api/auth/me...');
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`📡 [Dashboard] Attempt 1 response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [Dashboard] Auth check passed, user:', data.user);
          if (data.user && data.user.role === 'admin') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }

        // Not authenticated - retry if we just logged in
        if (shouldRetry) {
          console.log('⏳ [Dashboard] First attempt failed, retrying after additional delay...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          console.log('📍 [Dashboard] Attempt 2: Checking /api/auth/me...');
          const retryResponse = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            }
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
            console.log('❌ [Dashboard] Retry auth check failed with status:', retryResponse.status);
            try {
              const errorData = await retryResponse.json();
              console.log('❌ [Dashboard] Error details:', errorData);
            } catch (e) {
              console.log('❌ [Dashboard] Could not parse error response');
            }
          }
        }

        // Not authenticated
        console.log('❌ [Dashboard] Not authenticated after all attempts, redirecting to login');
        router.push('/login');
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
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

  return <NurseProAdminUltimate />;
}
