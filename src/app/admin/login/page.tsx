'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me?type=admin', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.role === 'admin') {
            router.replace('/admin/dashboard');
            return;
          }
        }
      } catch (error) {
        console.log('Not authenticated, showing login form');
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 [Admin Login] Attempting login for:', email);
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
        credentials: 'include',
      });

      console.log('📡 [Admin Login] Response status:', response.status);

      if (response.status === 0) {
        setError('Network error. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        let data: any = null;

        try {
          data = await response.json();
          console.log('✅ [Admin Login] Login successful, user:', data.user);
        } catch (parseError) {
          console.error('❌ [Admin Login] Failed to parse response');
          window.location.replace('/admin/dashboard');
          return;
        }

        if (!data || !data.user) {
          setError('Login successful but user data missing');
          setIsLoading(false);
          return;
        }

        if (data.user.role !== 'admin') {
          setError('This account is not an admin account. Please use the student portal to login.');
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('adminUser', JSON.stringify(data.user));
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        sessionStorage.setItem('shouldRedirect', 'true');

        console.log('✅ [Admin Login] Setting redirect flag and redirecting...');
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 500);

        return;

      } else {
        let errorData: any = null;
        try {
          const responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (e) {
          // Ignore parse errors
        }

        setError(errorData?.message || `Login failed (Status: ${response.status})`);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('❌ [Admin Login] Error:', error);
      setError(error?.message || 'Network error. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-emerald-600/20 blur-3xl" />

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_-12px_rgba(16,185,129,0.6)]">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">Admin Portal</h2>
          <p className="mt-2 text-sm text-slate-300">Sign in to your admin account</p>
        </div>

        {/* Form Container */}
        <div className="space-y-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-teal-900/20">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-3 bg-white/5 text-slate-100 placeholder-slate-400 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-white/10 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_10px_40px_-12px_rgba(16,185,129,0.6)]"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-300">
            Not an admin?{' '}
            <Link
              href="/login"
              className="font-medium text-emerald-300 hover:text-emerald-200"
            >
              Student Login
            </Link>
          </p>
          <p className="text-sm text-slate-300">
            <Link
              href="/"
              className="font-medium text-emerald-300 hover:text-emerald-200"
            >
              Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

