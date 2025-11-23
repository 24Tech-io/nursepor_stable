'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminWelcomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated - with error handling
  useEffect(() => {
    let mounted = true;
    
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        }).catch((fetchError) => {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        });

        if (!mounted) return;

        if (response && response.ok) {
          const data = await response.json().catch((jsonError) => {
            console.error('JSON parse error:', jsonError);
            return null;
          });
          
          if (!mounted) return;
          
          if (data && data.user && data.user.role === 'admin') {
            // Already logged in, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        }
      } catch (error: any) {
        if (!mounted) return;
        console.error('Auth check error on root page:', error);
        setError(error?.message || 'Unknown error');
        // Not authenticated, show welcome page
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [router]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
          {error && (
            <p className="mt-2 text-red-600 text-sm">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">Admin Portal</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Admin
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"> Control Center</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Manage courses, Q-Banks, and student registrations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg"
            >
              Create Admin Account
            </Link>
            <Link
              href="/login"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

